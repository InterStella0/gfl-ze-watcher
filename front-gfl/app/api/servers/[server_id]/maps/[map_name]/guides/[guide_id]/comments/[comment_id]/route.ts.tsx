import {CreateUpdateCommentDto} from "types/guides.ts";
import {NextResponse} from "next/server";
import {proxyToBackendChange} from "lib/apiProxy.ts";

export async function PUT(
    req: Request,
    context: { params: Promise<{ server_id: string; map_name: string; guide_id: string; comment_id: string }> }
) {
    try {
        const { guide_id, map_name, comment_id } = await context.params;

        const body: CreateUpdateCommentDto = await req.json();
        if (!body.content || body.content.trim().length === 0) {
            return NextResponse.json(
                { msg: "Comment content is required", data: null },
                { status: 400 }
            );
        }

        if (body.content.length > 2000) {
            return NextResponse.json(
                { msg: "Comment is too long. Maximum 2000 characters.", data: null },
                { status: 400 }
            );
        }

        return await proxyToBackendChange<CreateUpdateCommentDto>(`/maps/${map_name}/guides/${guide_id}/comments/${comment_id}`, body, "PUT")
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json(
            { msg: "Internal server error", data: null },
            { status: 500 }
        );
    }
}
export async function DELETE(
    req: Request,
    context: { params: Promise<{ server_id: string; map_name: string; guide_id: string; comment_id: string }> }
) {
    try {
        const { guide_id, map_name, comment_id } = await context.params;

        return await proxyToBackendChange(`/maps/${map_name}/guides/${guide_id}/comments/${comment_id}`, null, "DELETE")
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json(
            { msg: "Internal server error", data: null },
            { status: 500 }
        );
    }
}