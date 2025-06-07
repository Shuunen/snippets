export type FfProbeOutputStream = {
  avg_frame_rate: string // eslint-disable-line @typescript-eslint/naming-convention
  codec_name: string // eslint-disable-line @typescript-eslint/naming-convention
  codec_type: string // eslint-disable-line @typescript-eslint/naming-convention
  color_transfer: string // eslint-disable-line @typescript-eslint/naming-convention
  duration: string
  height: number
  side_data_list?: {
    // eslint-disable-line @typescript-eslint/naming-convention
    side_data_type: string // eslint-disable-line @typescript-eslint/naming-convention
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
    bit_rate: number // eslint-disable-line @typescript-eslint/naming-convention
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
