export const formatPhone = (phone: string): string => {
  return phone.replace(/\D/g, '')
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
