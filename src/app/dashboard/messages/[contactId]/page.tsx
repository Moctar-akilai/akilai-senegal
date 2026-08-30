import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatHeure(date: string) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, nom, telephone")
    .eq("id", contactId)
    .eq("gestionnaire_id", user!.id)
    .maybeSingle();

  if (!contact) notFound();

  const { data: messages } = await supabase
    .from("conversations_whatsapp")
    .select("id, direction, type_message, contenu, audio_url, created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });

  const messagesAvecAudio = await Promise.all(
    (messages ?? []).map(async (message) => {
      if (message.type_message === "audio" && message.audio_url) {
        const { data } = await supabase.storage
          .from("audios-whatsapp")
          .createSignedUrl(message.audio_url, 3600);
        return { ...message, audioSignedUrl: data?.signedUrl ?? null };
      }
      return { ...message, audioSignedUrl: null };
    })
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/dashboard/messages" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Messages
        </Link>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-900">{contact.nom || contact.telephone}</h1>
        {contact.nom && <p className="text-sm text-neutral-500">{contact.telephone}</p>}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        {(!messagesAvecAudio || messagesAvecAudio.length === 0) && (
          <p className="py-8 text-center text-sm text-neutral-500">Aucun message pour l&apos;instant.</p>
        )}

        {messagesAvecAudio.map((message) => {
          const estEntrant = message.direction === "entrant";
          return (
            <div
              key={message.id}
              className={`flex flex-col ${estEntrant ? "items-start" : "items-end"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  estEntrant
                    ? "bg-neutral-100 text-neutral-900"
                    : "bg-neutral-900 text-white"
                }`}
              >
                {message.type_message === "audio" && message.audioSignedUrl ? (
                  <div className="space-y-1">
                    <audio controls src={message.audioSignedUrl} className="max-w-full" />
                    {message.contenu && <p className="text-xs opacity-80">{message.contenu}</p>}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.contenu}</p>
                )}
              </div>
              <span className="mt-1 text-xs text-neutral-400">{formatHeure(message.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
