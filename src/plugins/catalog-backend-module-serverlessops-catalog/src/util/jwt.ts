import { jwtDecode } from 'jwt-decode'

interface Response {
    access_token: string
}

/**
 * Retrieves a JWT token using client credentials authentication.
 * 
 * @param clientId - The client ID for authentication
 * @param clientSecret - The client secret for authentication
 * @param url - The authentication endpoint URL
 * @returns A Promise that resolves to the JWT access token
 * @throws {Error} When no access token is received in the response
 * @throws {Error} When the HTTP request fails
 */
export async function getJwt(
    clientId: string,
    clientSecret: string,
    url: string
): Promise<string> {
    try {
        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: clientId,
                    client_secret: clientSecret
                })
            }
        )

        const response_data: Response = await response.json()

        if ( !response.ok ) {
            throw new Error(`Failed to get JWT: ${response_data}`)
        }
        if (!response_data.access_token) {
            throw new Error('No access token received in response')
        }

        return response_data.access_token

    } catch (error) {
        throw error
    }
}

/**
 * Checks if a JWT token is expired.
 * 
 * @param token - The JWT token to check
 * @returns True if the token is expired, false otherwise
 */
export function isJwtExpired(token: string): boolean {
    const jwtExpiration = jwtDecode(token).exp || 0
    const now = Date.now() / 1000

    return jwtExpiration < now
}