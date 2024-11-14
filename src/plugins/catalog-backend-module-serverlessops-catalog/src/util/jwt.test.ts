import { getJwt } from './jwt'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('getJwt', () => {
    const mockClientId = 'test-client-id'
    const mockClientSecret = 'test-client-secret'
    const mockUrl = 'https://api.example.com/oauth/token'
    const mockToken = 'mock-access-token'

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('getJwt()', () => {
        describe('should succeed when', () => {
            test('successfully retrieves a JWT token', async () => {
                mockedAxios.post.mockResolvedValue(
                    {data: { access_token: mockToken }}
                )

                const token = await getJwt(mockClientId, mockClientSecret, mockUrl)

                expect(token).toBe(mockToken)
                expect(mockedAxios.post).toHaveBeenCalledWith(
                    mockUrl,
                    expect.any(URLSearchParams),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                    }
                )
            })
        })

        describe('should fail when', () => {
            test('throws error when no access token in response', async () => {
                mockedAxios.post.mockResolvedValue({data:{}})

                await expect(
                    getJwt(mockClientId, mockClientSecret, mockUrl)
                ).rejects.toThrow('No access token received in response')
            })

            test('throws error when fetch fails', async () => {
                mockedAxios.post.mockRejectedValue(
                    new Error('Failed to get JWT: Network error')
                )

                await expect(
                    getJwt(mockClientId, mockClientSecret, mockUrl)
                ).rejects.toThrow('Failed to get JWT: Network error')
            })
        })
    })

    describe('isJwtExpired()', () => {
        describe('should succeed when', () => {
            test.skip('returns true when token is expired', () => {})
        })
    })
})
