import CreateTemplateForm from "@/components/whatsapp-templates/create-template-form";

export default function NewTemplatePage() {
    // Hardcoded WABA ID for demo/MVP purposes as per prompt context usually implying one account.
    // In a real SaaS, this would come from the user's context/session.
    const wabaId = "100609346426084";

    return (
        <div className="container mx-auto py-10">
            <CreateTemplateForm wabaId={wabaId} />
        </div>
    )
}
