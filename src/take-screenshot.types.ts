export type FfProbeOutputStream = {
  avg_frame_rate: string
  codec_name: string
  codec_type: string
  color_transfer: string
  duration: string
  height: number
  side_data_list?: {
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
