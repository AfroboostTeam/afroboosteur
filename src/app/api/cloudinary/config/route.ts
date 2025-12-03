import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        // No need to parse JSON body for this endpoint
        // We're just returning configuration data

        // Validate that required environment variables are set
        if (
            !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
            !process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
        ) {
            return NextResponse.json(
                {
                    error:
                        'Cloudinary configuration missing. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variables.',
                },
                { status: 500 }
            );
        }

        // Return configuration for unsigned upload
        return NextResponse.json({
            cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
            uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
            apiKey: process.env.CLOUDINARY_API_KEY, // Optional for unsigned uploads
        });
    } catch (error) {
        console.error('Error getting Cloudinary config:', error);
        return NextResponse.json(
            { error: 'Failed to get upload configuration' },
            { status: 500 }
        );
    }
}
