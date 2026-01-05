// Script pour importer les données du Google Sheet vers Supabase
// Exécuter ce fichier avec: node import-subscribers.mjs

const SUPABASE_URL = "https://btujycztangypsraqfdw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0dWp5Y3p0YW5neXBzcmFxZmR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDAwMTQsImV4cCI6MjA4MzAxNjAxNH0.BLijGioY1oBzbFcmXjKvl-enKppyZfmzwcEVxnINq5w";

// Données du Google Sheet
const subscribers = [
  {
    psid: "26188149954121766",
    facebook_id: "26188149954121766",
    name_complet: "Mélina Céline Mirale",
    subscribed_at: "2026-01-02T15:56:38.200+01:00",
    last_interaction: "2026-01-03T12:54:43.565+01:00",
    is_active: true,
    is_subscribed: true,
    total_messages_sent: 3,
    total_messages_received: 0
  },
  {
    psid: "25384744947845188",
    facebook_id: "25384744947845188",
    name_complet: "Blk Nouha",
    subscribed_at: "2026-01-02T15:06:33.567+01:00",
    last_interaction: "2026-01-03T08:01:02.820+01:00",
    is_active: true,
    is_subscribed: true,
    total_messages_sent: 3,
    total_messages_received: 0
  },
  {
    psid: "33412284531718499",
    facebook_id: "33412284531718499",
    name_complet: "Salah Eddine Elachgar",
    subscribed_at: "2026-01-02T15:13:42.470+01:00",
    last_interaction: "2026-01-03T08:01:06.374+01:00",
    is_active: true,
    is_subscribed: true,
    total_messages_sent: 3,
    total_messages_received: 0
  }
];

async function importSubscribers() {
  console.log("Importing subscribers to Supabase...");
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(subscribers)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Error:", error);
    return;
  }

  const data = await response.json();
  console.log("Success! Imported", data.length, "subscribers:");
  data.forEach(sub => console.log(`  - ${sub.name_complet} (${sub.psid})`));
}

importSubscribers();
