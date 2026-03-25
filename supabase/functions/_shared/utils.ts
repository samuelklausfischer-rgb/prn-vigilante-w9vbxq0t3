export const logInfo = (message: string, data?: any) => {
  console.log(JSON.stringify({ level: 'INFO', message, data }))
}

export const logError = (message: string, error?: any) => {
  console.error(JSON.stringify({ level: 'ERROR', message, error: error?.message || error }))
}
