import CreateTemplateForm from "@/components/whatsapp-templates/create-template-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NewTemplatePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        redirect("/login");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { whatsappBusinessId: true }
    });

    const wabaId = user?.whatsappBusinessId || "";

    return (
        <div className="container mx-auto py-10">
            <CreateTemplateForm wabaId={wabaId} />
        </div>
    )
}
