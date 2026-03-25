import { useState } from 'react'

export function useAppData(initialData: any[] = []) {
  const [data, setData] = useState(initialData)
  const [config, setConfig] = useState({ is_paused: false })

  const toggleSystemPause = async (paused: boolean) => {
    setConfig({ is_paused: paused })
    // Mocking an API call
    return true
  }

  return {
    data,
    config,
    toggleSystemPause,
    setData,
  }
}
