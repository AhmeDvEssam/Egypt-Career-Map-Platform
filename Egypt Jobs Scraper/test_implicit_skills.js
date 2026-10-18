const text = `GTA V Gamer / Content Creator TheSoul Group is a leading creator business platform positioned at the heart of the creator economy...
(We skip to the end)
We appreciate your interest in our job opportunities and our company. Our team carefully evaluates each application to identify the most suitable candidates for the role. Due to the high volume of applications received, we may not be able to respond to every applicant. However, if your qualifications align with our requirements, we will contact you to discuss the next steps in the selection process. 
- Extensive hands-on experience with GTA V on PC and strong knowledge of its mechanics, characters, vehicles, weapons, locations, and gameplay systems. 
- High-level gameplay skills, including confident driving, racing, shooting, combat, and the ability to complete challenging gameplay scenarios. 
- Practical experience installing, configuring, and troubleshooting GTA V single-player mods. 
- Familiarity with GTA V modding and scene-building tools such as OpenIV, Menyoo, Map Editor, CodeWalker, Script Hook V, Rockstar Editor, Director Mode, Scene Creator , or equivalent tools. 
- Ability to research and source suitable maps, skins, characters, vehicles, and other assets, assess their compatibility, install them correctly, and adapt them to production needs. 
- Experience building custom scenes by loading or modifying maps, placing characters, vehicles, and props, assigning positions and animations, and testing the complete setup before recording. 
- Experience recording smooth, high-quality gameplay using OBS Studio, NVIDIA ShadowPlay , or similar capture software. 
- Basic video-editing skills using Adobe Premiere Pro, DaVinci Resolve, CapCut , or similar software. 
- A Windows PC capable of running a heavily modded version of GTA V while recording high-quality gameplay. 
- A licensed PC copy of GTA V. 
- Sufficient English proficiency to confidently understand production briefs, mod descriptions, installation guides, and technical documentation. 
- Strong awareness of gaming, GTA V, YouTube, TikTok, short-form content, and current online trends. 
- Proactive, creative, reliable, and detail-oriented, with the ability to troubleshoot technical issues and work independently. 
- Formal education is not required; practical experience, technical knowledge, and demonstrated skills are more important. 
- A portfolio or examples of modded GTA V gameplay, custom scenes, maps, or edited gaming videos would be a strong advantage.`;

const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 0);

const kwRegex = /skills?|requirements?|required|qualifications?|what we are looking for|what you'll need|what you bring|nice to have|bonus points|المؤهلات|المهارات|technical skills|core competencies/i;

let isCapturing = false;
let extractedSkills = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if this line is a header
    const isShort = line.length > 0 && line.length < 60;
    // bullet check: starts with -, •, *, ·, or Number.
    const isBullet = /^[-•*·\d]+\.?/.test(line); 
    
    if (isShort && !isBullet) {
        if (kwRegex.test(line)) {
            isCapturing = true;
            continue; 
        } else if (isCapturing) {
            if (/benefits|what we offer|about us|company|how to apply|who we are|our mission/i.test(line)) {
                isCapturing = false;
            }
        }
    }
    
    // IMPLICIT SKILLS LIST DETECTION
    if (isBullet && !isCapturing) {
        if (/(experience|ability|familiarity|skills?|proficien|knowledge|degree|bachelor|master|capable|understanding)\b/i.test(line)) {
            isCapturing = true;
        }
    }
    
    if (isCapturing) {
        extractedSkills.push(line);
    }
}

console.log('EXTRACTED SKILLS:');
console.log(extractedSkills.join('\n'));
