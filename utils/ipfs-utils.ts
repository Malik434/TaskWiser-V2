import { compressImage } from "./image-utils"

/**
 * Uploads a file to IPFS using Pinata API
 * @param file The file to upload
 * @param options Optional configuration
 * @returns The IPFS URL of the uploaded file
 */
export async function uploadToIPFS(
  file: File,
  options: {
    compressImage?: boolean
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<string> {
  try {
    // Default options
    const { compressImage: shouldCompress = true, maxWidth = 800, maxHeight = 800, quality = 0.8 } = options

    // Compress the image if needed
    const fileToUpload =
      shouldCompress && file.type.startsWith("image/") ? await compressImage(file, maxWidth, maxHeight, quality) : file

    // Create form data for the file
    const formData = new FormData()
    formData.append("file", fileToUpload)

    // Metadata for Pinata
    const metadata = JSON.stringify({
      name: `profile-${Date.now()}`,
      keyvalues: {
        app: "TaskWiser",
        type: "profile-picture",
        timestamp: Date.now().toString(),
      },
    })
    formData.append("pinataMetadata", metadata)

    // Options for Pinata
    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    })
    formData.append("pinataOptions", pinataOptions)

    // Get API keys from environment variables
    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY
    const pinataSecretApiKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY

    if (!pinataApiKey || !pinataSecretApiKey) {
      throw new Error("Pinata API keys are not configured")
    }

    // Upload to Pinata
    console.log("Uploading to Pinata...")
    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: {
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecretApiKey,
        },
        body: formData,
      })

      // Get the response as text first for debugging
      const responseText = await res.text()
      console.log("Pinata response:", responseText)

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Error parsing Pinata response:", parseError)
        throw new Error(`Failed to parse Pinata response: ${responseText.substring(0, 100)}...`)
      }

      // Check if the response contains an error
      if (!res.ok) {
        const errorMessage = data.error || data.message || "Unknown error"
        console.error("Pinata error response:", data)
        throw new Error(`Failed to upload to Pinata: ${errorMessage}`)
      }

      // Check if we have the expected IpfsHash in the response
      if (!data.IpfsHash) {
        console.error("Missing IpfsHash in Pinata response:", data)
        throw new Error("Pinata response missing IpfsHash")
      }

      console.log("Successfully uploaded to IPFS:", data)

      // Return the IPFS URL
      // Using a public gateway for better compatibility
      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
    } catch (error) {
      console.error("Error in Pinata API call:", error)
      throw error
    }
  } catch (error) {
    console.error("Error uploading to IPFS:", error)
    throw error
  }
}

/**
 * Extracts the IPFS hash from an IPFS URL
 * @param url The IPFS URL
 * @returns The IPFS hash
 */
export function getIpfsHashFromUrl(url: string): string | null {
  // Handle ipfs:// protocol
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "")
  }

  // Handle gateway URLs
  const ipfsGatewayPattern = /ipfs\/([a-zA-Z0-9]+)/
  const match = url.match(ipfsGatewayPattern)

  return match ? match[1] : null
}

/**
 * Converts an IPFS hash to a gateway URL
 * @param hash The IPFS hash
 * @param gateway The gateway URL to use
 * @returns The gateway URL for the IPFS hash
 */
export function ipfsHashToUrl(hash: string, gateway = "https://gateway.pinata.cloud/ipfs/"): string {
  if (!hash) return ""

  // Remove ipfs:// prefix if present
  const cleanHash = hash.replace("ipfs://", "")

  return `${gateway}${cleanHash}`
}
