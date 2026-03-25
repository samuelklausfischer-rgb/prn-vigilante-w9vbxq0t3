export const formatPhone = (phone: string) => phone.replace(/\D/g, '')
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))
