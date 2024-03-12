export type Task = {
  screenPath: string
  totalSeconds: number
  videoPath: string
}

export type FfProbeOutput = {
  format: {
    duration: number
    filename: string
    size: number
    tags?: {
      title: string
    }
  }
  streams: {
    codec_type: string // eslint-disable-line @typescript-eslint/naming-convention
    duration: string
    height: number
    width: number
  }[]
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
