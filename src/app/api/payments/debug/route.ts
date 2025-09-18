import { NextResponse } from 'next/server';

export async function GET() {
    try {
        console.log('🔍 Testing Polar connection...');

        const token = process.env.POLAR_ACCESS_TOKEN;
        console.log('Token exists:', !!token);
        console.log('Token preview:', token ? `${token.substring(0, 20)}...` : 'NOT_SET');

        if (!token) {
            return NextResponse.json({
                error: 'No Polar token configured'
            }, { status: 400 });
        }

        // Test direct API call
        const response = await fetch('https://sandbox-api.polar.sh/v1/organizations', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        const text = await response.text();
        console.log('API Response Status:', response.status);
        console.log('API Response:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }

        return NextResponse.json({
            success: response.ok,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: data
        });

    } catch (error) {
        console.error('Debug error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
