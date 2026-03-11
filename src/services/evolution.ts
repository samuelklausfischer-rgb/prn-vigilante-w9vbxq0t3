import { WhatsAppInstance } from '@/types'

// Mock Data for Evolution API Instances
let MOCK_INSTANCES: WhatsAppInstance[] = [
  { slotId: 1, instanceName: 'PRN Principal', status: 'connected' },
  { slotId: 2, instanceName: 'PRN Marketing', status: 'disconnected' },
  { slotId: 3, instanceName: null, status: 'empty' },
]

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const evolutionApi = {
  async getInstances(): Promise<WhatsAppInstance[]> {
    await delay(600) // Simulate network latency
    return [...MOCK_INSTANCES]
  },

  async getQrCode(slotId: number): Promise<string> {
    await delay(1500) // Simulate fetching QR Code
    // Provide a real QR code generating API for visual feedback
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=evolution-auth-${slotId}-${Date.now()}`
  },

  async disconnect(slotId: number): Promise<boolean> {
    await delay(1200) // Simulate disconnection process
    const instance = MOCK_INSTANCES.find((i) => i.slotId === slotId)
    if (instance) {
      instance.status = 'disconnected'
      return true
    }
    return false
  },

  async create(slotId: number, name: string): Promise<boolean> {
    await delay(800) // Simulate creation process
    const instance = MOCK_INSTANCES.find((i) => i.slotId === slotId)
    if (instance) {
      instance.instanceName = name
      instance.status = 'disconnected'
      return true
    }
    return false
  },

  // Helper just to mock a successful QR code scan on the UI
  async simulateScan(slotId: number): Promise<boolean> {
    await delay(1000)
    const instance = MOCK_INSTANCES.find((i) => i.slotId === slotId)
    if (instance) {
      instance.status = 'connected'
      return true
    }
    return false
  },
}
