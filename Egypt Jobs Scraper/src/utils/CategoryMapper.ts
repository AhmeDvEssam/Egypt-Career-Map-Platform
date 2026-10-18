export function categorizeJob(title: string): string {
    if (!title) return 'Other / Uncategorized';
    const t = title.toLowerCase();

    // 1. Software & IT (Exclude traditional engineering)
    if (/(software|developer|it\b|data|tech|frontend|backend|full stack|cyber|network|devops|ai|machine learning)/i.test(t) && !/(civil|mechanical|electrical|chemical|sales|support)/i.test(t)) {
        return 'Software Development / IT';
    }

    // 2. Sales
    if (/(sales|business development|account manager|telesales|retail|b2b|b2c|presales|commercial)/i.test(t)) {
        return 'Sales / Business Development';
    }

    // 3. Marketing & PR
    if (/(marketing|seo|social media|content|pr|digital|brand|media buyer)/i.test(t)) {
        return 'Marketing / PR';
    }

    // 4. Customer Service
    if (/(customer service|support|call center|help desk|receptionist|front desk|guest relation)/i.test(t)) {
        return 'Customer Service / Support';
    }

    // 5. HR
    if (/(hr\b|human resources|recruitment|talent|payroll|personnel)/i.test(t)) {
        return 'Human Resources';
    }

    // 6. Finance
    if (/(accounting|finance|tax|auditor|accountant|financial|treasury)/i.test(t)) {
        return 'Accounting / Finance';
    }

    // 7. Engineering (Traditional)
    if (/(civil|mechanical|electrical|architect|design engineer|maintenance engineer|mechatronics|quality engineer|production engineer)/i.test(t)) {
        return 'Engineering / Construction';
    }

    // 8. Operations & Admin
    if (/(operations|manager|director|admin|secretary|office manager|executive assistant|data entry|clerk)/i.test(t)) {
        return 'Operations / Administration';
    }

    // 9. Healthcare
    if (/(doctor|nurse|healthcare|medical|clinic|pharmacy|pharmacist|physician)/i.test(t)) {
        return 'Medical / Healthcare';
    }

    // 10. Education
    if (/(teacher|instructor|tutor|education|professor|school|university)/i.test(t)) {
        return 'Education / Training';
    }

    // 11. Logistics
    if (/(logistics|supply chain|warehouse|delivery|fleet|procurement|inventory|purchasing)/i.test(t)) {
        return 'Logistics / Supply Chain';
    }

    // 12. Design & Creative
    if (/(design|ui|ux|graphic|creative|art|animator|video editor)/i.test(t)) {
        return 'Design / Creative';
    }

    return 'Other / Uncategorized';
}
