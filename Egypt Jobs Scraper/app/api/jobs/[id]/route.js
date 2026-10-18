"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const prisma_1 = require("@/app/lib/prisma");
async function GET(_request, { params }) {
    const { id } = await params;
    try {
        const job = await prisma_1.prisma.job.findUnique({
            where: { id },
            include: {
                descriptions: true,
                skills: {
                    include: {
                        skill: true,
                    },
                },
                industries: {
                    include: {
                        industry: true,
                    },
                },
            },
        });
        if (!job) {
            return server_1.NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({ job });
    }
    catch (err) {
        console.error(`API /api/jobs/${id} error:`, err);
        return server_1.NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
    }
}
