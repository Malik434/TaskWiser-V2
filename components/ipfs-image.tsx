"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ipfsHashToUrl, getIpfsHashFromUrl } from "@/utils/ipfs-utils"

interface IpfsImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fallbackSrc?: string
}

export function IpfsImage({
  src,
  alt,
  width = 100,
  height = 100,
  className = "",
  fallbackSrc = "/placeholder.svg",
}: IpfsImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(src)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    if (src.startsWith("ipfs://") || src.includes("/ipfs/")) {
      const hash = getIpfsHashFromUrl(src)
      if (hash) {
        setImageSrc(ipfsHashToUrl(hash))
      }
    } else {
      setImageSrc(src)
    }
  }, [src])

  const handleError = () => {
    if (!error) {
      setError(true)
      setImageSrc(fallbackSrc)
    }
  }

  return (
    <Image
      src={imageSrc || "/placeholder.svg"}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
    />
  )
}
