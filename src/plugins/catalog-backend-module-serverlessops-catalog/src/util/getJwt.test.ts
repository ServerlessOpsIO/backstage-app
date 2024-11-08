import { getJwt } from './getJwt'
import mockFetch from "jest-fetch-mock"

describe('getJwt', () => {
    const mockClientId = 'test-client-id'
    const mockClientSecret = 'test-client-secret'
    const mockUrl = 'https://api.example.com/oauth/token'
    const mockToken = 'mock-access-token'

    beforeEach(() => {
        mockFetch.enableMocks()
    })

    afterEach(() => {
        mockFetch.resetMocks()
    })

    describe('getJwt()', () => {
        describe('should succeed when', () => {
            test('successfully retrieves a JWT token', async () => {
                mockFetch.mockResponse(
                    JSON.stringify({ access_token: mockToken })
                )

                const token = await getJwt(mockClientId, mockClientSecret, mockUrl)

                expect(token).toBe(mockToken)
                expect(global.fetch).toHaveBeenCalledWith(
                    mockUrl,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: expect.any(URLSearchParams)
                    }
                )
            })
        })

        describe('should fail when', () => {
            it('throws error when no access token in response', async () => {
                mockFetch.mockResponse(
                    JSON.stringify({})
                )

                await expect(
                    getJwt(mockClientId, mockClientSecret, mockUrl)
                ).rejects.toThrow('No access token received in response')
            })

            it('throws error when fetch fails', async () => {
                mockFetch.mockRejectedValueOnce(
                    new Error('Network error')
                )

                await expect(
                    getJwt(mockClientId, mockClientSecret, mockUrl)
                ).rejects.toThrow('Failed to get JWT: Network error')
            })
        })
    })
})
