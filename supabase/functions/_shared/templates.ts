export const getMessageTemplate = (templateName: string, variables: Record<string, string>) => {
  // A simple template engine for webhook responses or messages
  return `Template [${templateName}] rendered with variables: ${JSON.stringify(variables)}`
}
