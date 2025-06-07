export type FfProbeOutputStream = {
  // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
  avg_frame_rate: string
  // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
  codec_name: string
  // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
  codec_type: string
  // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
  color_transfer: string
  duration: string
  height: number
  // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
  side_data_list?: {
    // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
    side_data_type: string
  }[]
  width: number
}

export type Task = {
  screenPath: string
  totalSeconds: number
  videoPath: string
}

export type FfProbeOutput = {
  format?: {
    // biome-ignore lint/style/useNamingConvention: ffprobe uses snake_case
    bit_rate: number
    duration: number
    filename: string
    size: number
    tags?: {
      title: string
    }
  }
  streams?: FfProbeOutputStream[] | undefined
}

export type Metadata = {
  duration: number
  filepath?: string
  height: number
  size: number
  title: string
}

export type Target = {
  minutes: number
  seconds: number
}
