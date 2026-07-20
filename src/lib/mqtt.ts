import mqtt, { type MqttClient } from 'mqtt'

// ── MQTT kapcsolat — VSZ broker ─────────────────────────────────────────────
// Ugyanaz a broker/hitelesítés, mint a Python oldalon:
//   host=192.168.10.8, port=1883, topic="vsz/mortoff", topic1="vsz/system"
//   client.username_pw_set("vargaszarnyas", password="...")
//
// Szükséges .env.local változók:
//   MQTT_ENABLED=true
//   MQTT_HOST=192.168.10.8
//   MQTT_PORT=1883
//   MQTT_USER=vargaszarnyas
//   MQTT_PASSWORD=<jelszó>

let client: MqttClient | null = null
let connecting: Promise<MqttClient> | null = null

function isEnabled() {
  return process.env.MQTT_ENABLED === 'true'
}

function getClient(): Promise<MqttClient> {
  if (client?.connected) return Promise.resolve(client)
  if (connecting) return connecting

  const host = process.env.MQTT_HOST
  const port = Number(process.env.MQTT_PORT ?? 1883)
  const username = process.env.MQTT_USER
  const password = process.env.MQTT_PASSWORD

  if (!host) return Promise.reject(new Error('MQTT_HOST nincs beállítva'))

  connecting = new Promise((resolve, reject) => {
    const c = mqtt.connect(`mqtt://${host}:${port}`, {
      username,
      password,
      connectTimeout: 10_000,
      reconnectPeriod: 0, // egyszeri kapcsolat, nem próbálkozik automatikusan újra
    })

    c.once('connect', () => {
      client = c
      connecting = null
      resolve(c)
    })

    c.once('error', (err) => {
      connecting = null
      c.end(true)
      reject(err)
    })
  })

  return connecting
}

export async function publishMqtt(topic: string, message: string) {
  if (!isEnabled()) return // MQTT kikapcsolva - csendben kihagyjuk

  const c = await getClient()
  await new Promise<void>((resolve, reject) => {
    c.publish(topic, message, { qos: 1 }, (err) => {
      if (err) reject(err)
      else resolve()
    })
  })
}
