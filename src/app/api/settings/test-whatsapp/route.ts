import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(request: NextRequest) {
    try {
        const { phoneNumberId, accessToken } = await request.json()

        if (!phoneNumberId || !accessToken) {
            return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
        }

        // Test credentials by fetching phone number details from Meta Graph API
        const url = `https://graph.facebook.com/v19.0/${phoneNumberId}`

        await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error testing WhatsApp connection:', error)
        return NextResponse.json({ success: false, error: 'Connection failed' }, { status: 400 })
    }
}
