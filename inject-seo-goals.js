// One-time script: inject seoGoals + topCompetitors into homepage-data.json
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'homepage-data.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.topCompetitors = [
  { name: 'Canva', url: 'https://canva.com/resumes/templates' },
  { name: 'Resume.io', url: 'https://resume.io/resume-templates' },
  { name: 'MyPerfectResume', url: 'https://myperfectresume.com/resume/templates' },
  { name: 'Enhancv', url: 'https://enhancv.com/resume-templates' },
  { name: 'ResumeBuilder', url: 'https://resumebuilder.com/resume-templates' }
];

const csv = `resume template,642260,1,canva.com/resumes/templates
cv template,535740,1.1,canva.com/resumes/templates
resume templates,410680,1,canva.com/resumes/templates
resume format,645220,1.2,resume.io/resume-templates
resume templates free,147110,1,canva.com/resumes/templates
cv format,222120,2.8,canva.com/resumes/templates
free resume templates,133140,1,canva.com/resumes/templates
resume templates free download,167430,1.9,canva.com/resumes/templates
cv template free,59290,1,canva.com/resumes/templates
resume template free,51040,1,canva.com/resumes/templates
free cv template,47530,1.1,canva.com/resumes/templates
cv templates,42450,1,canva.com/resumes/templates
canva cv template,29280,1.1,canva.com/resumes/templates
cv template free download,32310,1.4,canva.com/resumes/templates
resume template free download,30680,1.5,canva.com/resumes/templates
canva resume templates,29900,1,canva.com/resumes/templates
curriculum vitae template,31580,1.6,canva.com/resumes/templates
professional cv,32650,2.7,canva.com/resumes/templates
resume format for job,33040,1.2,resume.io/resume-templates
professional resume template,14050,1.2,canva.com/resumes/templates
template resume,11440,1,canva.com/resumes/templates
resume for freshers,25590,3.5,resume.io/resume-templates
canva cv templates,15450,1,canva.com/resumes/templates
template for resume,8670,1.1,canva.com/resumes/templates
resume template download,16330,2.1,resume.io/resume-templates
cv template word,67570,6,canva.com/resumes/templates
free resume template,17070,1.1,canva.com/resumes/templates
canva resume,282460,1,canva.com/resumes/templates
resume format download,15460,1.1,resume.io/resume-templates
free resume templates download,14070,1.6,resume.io/resume-templates
resume builder,319500,1,resumebuilder.com/resume-templates
free cv template download,12270,1.4,canva.com/resumes/templates
cv form,13420,1.7,canva.com/resumes/templates
resume format for freshers,14860,2.2,resume.io/resume-templates
cv format download,10730,1.8,resume.io/resume-templates
professional cv template,13470,1.4,canva.com/resumes/templates
free cv templates,9690,1.1,canva.com/resumes/templates
resume sample,113090,4.6,canva.com/resumes/templates
job resume format,12750,1.9,resume.io/resume-templates
resume design,10650,1.3,canva.com/resumes/templates
best resume templates,25350,1.4,resume.io/resume-templates
cv sample,34960,4.3,canva.com/resumes/templates
cv format for job,17680,4.4,resume.io/resume-templates
resume free templates,6540,1,canva.com/resumes/templates
resume layout,10070,1.6,canva.com/resumes/templates
best resume format,18230,3.9,resume.io/resume-templates
cv template download,9560,1.4,canva.com/resumes/templates
resume template for freshers,9840,2.4,resume.io/resume-templates
template cv,11410,1.2,canva.com/resumes/templates
resume form,8240,1.8,resume.io/resume-templates
professional resume,38560,2.8,resume.io/resume-templates
professional cv format,10430,1.8,canva.com/resumes/templates
resume for job,14710,6.8,resume.io/resume-templates
resume template word free download,18900,4.3,canva.com/resumes/templates
resume model,14370,1.1,canva.com/resumes/templates
professional resume format,10750,1.7,resume.io/resume-templates
templates for resume,4180,1,canva.com/resumes/templates
sample resume,34470,7.4,canva.com/resumes/templates
cv format pdf,21610,3.8,canva.com/resumes/templates
cv templates free,5340,1.1,canva.com/resumes/templates
cv template word free download,17060,5.3,canva.com/resumes/templates
harvard resume template,40250,17.6,canva.com/resumes/templates
best cv template,8210,1.7,canva.com/resumes/templates
resume template download free,8730,2,canva.com/resumes/templates
resume formats,7170,1.6,canva.com/resumes/templates
curriculum vitae format,29570,7.2,canva.com/resumes/templates
sample resume format,9200,1.5,resume.io/resume-templates
template for cv,5410,1.1,canva.com/resumes/templates
cv free template,5470,1,canva.com/resumes/templates
experience resume format,2920,12,resume.io/resume-templates
resume outline,6480,1.1,canva.com/resumes/templates
cv resume template,4160,1.1,canva.com/resumes/templates
best cv format,11040,3.9,canva.com/resumes/templates
fresher resume format,7000,2.5,resume.io/resume-templates
format of resume,5000,4.4,resume.io/resume-templates
fresher resume template,1980,2.2,resume.io/resume-templates
cv format word,24150,9.7,canva.com/resumes/templates
resume format pdf,21480,3.9,canva.com/resumes/templates
free resume template download,4890,2.2,canva.com/resumes/templates
ats friendly resume template,48250,9.6,enhancv.com/resume-templates
resume download,5690,1.2,resume.io/resume-templates
resumes templates,3770,1.1,canva.com/resumes/templates
canva cv maker,29260,4.1,canva.com/resumes/templates
canva cv,107240,4.8,canva.com/resumes/templates
resume template word,23120,7.1,canva.com/resumes/templates
resume sample format,7000,1.8,canva.com/resumes/templates
modern cv template word free download,11860,4.6,canva.com/resumes/templates
free cv template word,12160,4,canva.com/resumes/templates
resume format word,18630,7.5,canva.com/resumes/templates
resume free template,3640,1,canva.com/resumes/templates
resume format for experienced,2520,1.8,resume.io/resume-templates
cv formats,5020,2.1,canva.com/resumes/templates
resume format template,2660,1.1,canva.com/resumes/templates
enhance cv,85930,1.1,enhancv.com/resume-templates
best resume template,5380,1.8,resume.io/resume-templates
professional cv template free,3650,1.1,canva.com/resumes/templates
professional resume templates,3960,1.1,canva.com/resumes/templates
cv layout,11000,4.7,canva.com/resumes/templates
resume pdf,11680,4.3,canva.com/resumes/templates
resume writing format,3450,8.5,resume.io/resume-templates
cv resume,19970,1.9,canva.com/resumes/templates
blank resume,2430,1.3,canva.com/resumes/templates
free templates for resume,2600,1,canva.com/resumes/templates
job resume template,6020,1.1,canva.com/resumes/templates
best cv templates,3670,1.8,canva.com/resumes/templates
sample cv,10790,5.1,canva.com/resumes/templates
cv templates free download,3330,1.5,canva.com/resumes/templates
best free resume templates,2340,1.3,canva.com/resumes/templates
job resume,26940,6.4,resume.io/resume-templates
template resume free,2560,1,canva.com/resumes/templates
best resume,12070,5.1,resume.io/resume-templates
enhancv,54310,1,enhancv.com/resume-templates
resume format in word,15020,9.7,canva.com/resumes/templates
resume sample for job application,8180,3.3,resume.io/resume-templates
free resume download,6000,2.7,resume.io/resume-templates
simple resume template free download,6820,3.2,canva.com/resumes/templates
resume for freshers with no experience,11190,4.5,resumebuilder.com/resume-templates
free resume templates word,8220,3.8,canva.com/resumes/templates
online resume template,2320,1.2,canva.com/resumes/templates
editable cv templates free download,2780,1.7,canva.com/resumes/templates
resume format for job fresher,3160,1.7,resume.io/resume-templates
sample resume templates,2540,1.4,canva.com/resumes/templates
resume format free download,2390,1.8,resume.io/resume-templates
cv resume format,4460,2.1,canva.com/resumes/templates
fresher resume,7620,2.7,resumebuilder.com/resume-templates
free template resume,2250,1.1,canva.com/resumes/templates
experience resume,3880,5,resume.io/resume-templates
cv samples,18860,4.4,canva.com/resumes/templates
good resume templates,3980,1.4,canva.com/resumes/templates
cv form template,2540,1,canva.com/resumes/templates
resume format for fresher,3630,2.7,resume.io/resume-templates
format resume,3920,5.8,resume.io/resume-templates
resume format download pdf,4390,3.4,myperfectresume.com/resume/templates
templates for resumes,1590,1,canva.com/resumes/templates
curriculum vitae sample,20990,7.3,canva.com/resumes/templates
sample resume for freshers,2630,3.1,resume.io/resume-templates
resume templates word,13680,6.2,canva.com/resumes/templates
job cv format,8620,4.3,canva.com/resumes/templates
resume format for jobs,2200,2,resume.io/resume-templates
cv form sample,2480,1.1,canva.com/resumes/templates
modern resume template,5490,2.8,resume.io/resume-templates
cv format for freshers,4040,2.5,resume.io/resume-templates
simple resume format word free download,9000,4,canva.com/resumes/templates
canva free resume templates,3590,1,canva.com/resumes/templates
canva resume templates free,2950,1,canva.com/resumes/templates
simple resume format pdf download,10530,3.9,canva.com/resumes/templates
sample resume template,1700,1.2,canva.com/resumes/templates
download resume templates,4390,1.7,canva.com/resumes/templates
new resume format,2410,2.7,resume.io/resume-templates
latest cv format,4100,4.2,canva.com/resumes/templates
free cv format,1920,1.2,canva.com/resumes/templates
new cv format,2680,2.2,canva.com/resumes/templates
blank resume template,4090,1.9,canva.com/resumes/templates
latest resume format,2800,1.8,resume.io/resume-templates
resume templates for free,1530,1,canva.com/resumes/templates
professional resume template free,1710,1.2,canva.com/resumes/templates
download free resume templates,2530,2.1,resume.io/resume-templates
ats resume template,26450,3.7,enhancv.com/resume-templates
free resume format,2680,1.5,canva.com/resumes/templates
resume background,4880,1.4,resume.io/resume-templates
resume format word free download,2870,3.2,resume.io/resume-templates
free template for resume,1450,1,canva.com/resumes/templates
resume format for job interview,8490,2.5,resumebuilder.com/resume-templates
resume layouts,1960,1.1,canva.com/resumes/templates
experienced resume format,1250,3.3,resume.io/resume-templates
cv format free download,2080,1.5,canva.com/resumes/templates
canva cv template free,1950,1,canva.com/resumes/templates
updated resume,4070,6.1,resume.io/resume-templates
free resumes templates,1550,1,canva.com/resumes/templates
freshers resume format,1400,2.4,resume.io/resume-templates
cv format template,1960,1.1,canva.com/resumes/templates
cv design,10520,5.1,canva.com/resumes/templates
templates cv,1510,1.3,canva.com/resumes/templates
resume template canva,1850,1,canva.com/resumes/templates
experienced resume,700,1,resume.io/resume-templates
resume pdf download,4630,3.1,canva.com/resumes/templates
resume.io,28400,1.1,resume.io/resume-templates
cv template pdf,2920,2.5,canva.com/resumes/templates
one page resume template,3630,2.9,canva.com/resumes/templates
cv template download free,2030,1.7,canva.com/resumes/templates
cv model,8010,3.8,canva.com/resumes/templates
canva resume builder,28130,1.4,canva.com/resumes/templates
resume designs,2100,1,canva.com/resumes/templates
canva resume template free,1760,1,canva.com/resumes/templates
design resume,2370,1.1,canva.com/resumes/templates
best resume format for experienced,820,1,resume.io/resume-templates
cv layouts,1730,1.9,canva.com/resumes/templates
functional resume template,3050,4.3,canva.com/resumes/templates
resume free download,2420,1.9,canva.com/resumes/templates
english cv template,1500,1.3,canva.com/resumes/templates
sample cv format,2150,2.4,canva.com/resumes/templates
free download resume templates,1450,1.7,canva.com/resumes/templates
ats friendly resume template free,1700,3.2,resume.io/resume-templates
freshers resume,2830,3.5,resume.io/resume-templates
my perfect resume,27040,4,myperfectresume.com/resume/templates
free professional resume template,1620,1.2,canva.com/resumes/templates
resume outlines,1750,1,canva.com/resumes/templates
sample of resume,8240,5.1,canva.com/resumes/templates
download cv template,2840,2.1,canva.com/resumes/templates
ats friendly resume,78100,45.7,enhancv.com/resume-templates
format of cv,2530,6.7,canva.com/resumes/templates
canva resume maker,24360,1,canva.com/resumes/templates
work resume template,2070,1.4,canva.com/resumes/templates
cv sample format,3410,2.3,canva.com/resumes/templates
free ats resume template,2550,3.7,resume.io/resume-templates
online cv template,1550,1.7,canva.com/resumes/templates
job application resume sample,4300,4.6,resume.io/resume-templates
best cv,4960,7.4,canva.com/resumes/templates
cv example,40450,17.1,canva.com/resumes/templates
download resume format,1610,3.3,resume.io/resume-templates
modern cv template,3600,3,resume.io/resume-templates
resume formate,1880,1.6,resume.io/resume-templates
resumes template,1380,1,canva.com/resumes/templates
canva.com,23720,1,canva.com/resumes/templates
editable resume,1000,1,canva.com/resumes/templates
free resume samples,1150,1.7,canva.com/resumes/templates
cv formate,2870,2.8,canva.com/resumes/templates
ats free resume,1360,1,resume.io/resume-templates
editable resume template free download,1860,1.4,canva.com/resumes/templates
cv designs,1820,1.4,canva.com/resumes/templates
professional resumes,3180,3.6,resume.io/resume-templates
canva resume template,35810,1.1,canva.com/resumes/templates
sample resume for experienced,750,2.7,resume.io/resume-templates
myperfectresume,22500,1.3,myperfectresume.com/resume/templates
professional cv design,1450,1,canva.com/resumes/templates
resume free templates download,600,1.5,resume.io/resume-templates
resume templates word free download,3300,3.8,canva.com/resumes/templates
resume for experienced,1320,2,resume.io/resume-templates
curriculum template,2160,1.5,canva.com/resumes/templates
modern resume templates,2470,3.2,resume.io/resume-templates
cv format free,1370,1.1,canva.com/resumes/templates
templates for cv,1050,1,canva.com/resumes/templates
word cv template,6850,6.2,canva.com/resumes/templates
fresher resume templates,1100,2,resume.io/resume-templates
updated resume format,2740,2.4,resume.io/resume-templates
resume template for free,1130,1,canva.com/resumes/templates
completely free resume templates,1110,1.1,canva.com/resumes/templates
curriculum vitae,126250,46.4,canva.com/resumes/templates
cv format sample,1580,2.2,canva.com/resumes/templates
resume forms,1350,1.2,canva.com/resumes/templates
resume templates download,1540,2,canva.com/resumes/templates
resume template for experienced,500,1,canva.com/resumes/templates
resume format sample,1100,1.7,resume.io/resume-templates
curriculum vitae template free,1000,1.2,canva.com/resumes/templates
resume professional,3260,4.5,resume.io/resume-templates
sample of cv,7510,6,canva.com/resumes/templates
cv examples,65810,23.3,canva.com/resumes/templates
resume template pdf,1960,1.9,canva.com/resumes/templates
sample of cv for job application,11250,7.1,resume.io/resume-templates
standard resume format,2980,4.4,resume.io/resume-templates
cv format for jobs,1000,1,resume.io/resume-templates
clean resume template,1080,1.4,canva.com/resumes/templates
sample cv template,1850,1.6,canva.com/resumes/templates
it resume template,1390,2.3,canva.com/resumes/templates
resume format for job application,1950,3.5,resume.io/resume-templates
free sample resume templates,1070,1.1,canva.com/resumes/templates
2025 resume template,2600,2,resume.io/resume-templates
resume draft,1560,1.2,canva.com/resumes/templates
cv english template,1000,1.3,canva.com/resumes/templates
resume io,32640,1,resume.io/resume-templates
formal resume format,1660,2,resume.io/resume-templates
free printable resume templates,480,1,canva.com/resumes/templates
cv templates download,1360,1.7,canva.com/resumes/templates
canva resume for freshers,2500,2,canva.com/resumes/templates
free online resume templates,860,1.1,canva.com/resumes/templates
cv english,11690,14,canva.com/resumes/templates
free curriculum vitae template,810,1.2,canva.com/resumes/templates
top resume templates,1470,1.7,resume.io/resume-templates
free cv templates download,1180,1.4,canva.com/resumes/templates
resume ground create,12000,209,myperfectresume.com/resume/templates
curriculum vitae templates,1200,1.4,canva.com/resumes/templates
harvard template resume,4950,6.2,canva.com/resumes/templates
professional resume layout,1360,1.5,canva.com/resumes/templates
cv template canva,1040,1.1,canva.com/resumes/templates
free professional resume templates,910,1.2,canva.com/resumes/templates
indian resume format,1060,5.7,resume.io/resume-templates
fresher resume sample,1500,3.8,resume.io/resume-templates
best resume for freshers,1610,4,resume.io/resume-templates
cv resume sample,1840,2,canva.com/resumes/templates
good resume,8210,8.9,resume.io/resume-templates
resume design templates,960,1,canva.com/resumes/templates
model resume template,1110,1,canva.com/resumes/templates
best template for resume,890,1.3,canva.com/resumes/templates
resume for work,2440,4.5,canva.com/resumes/templates
marketing resume template,1050,2.2,canva.com/resumes/templates
resume canva template,1070,1.2,canva.com/resumes/templates
good resume format,2690,4.7,resume.io/resume-templates
cv template english,870,1.2,canva.com/resumes/templates
download cv template free,1010,1.5,canva.com/resumes/templates
latest resume templates,820,1.2,canva.com/resumes/templates
resume tempalte,1120,1.1,canva.com/resumes/templates
cv design templates,820,1,canva.com/resumes/templates
cv word template,3970,6.7,canva.com/resumes/templates
freshers resume templates,860,3,resume.io/resume-templates
free templates for cv,820,1.1,canva.com/resumes/templates
template of resume,690,1,canva.com/resumes/templates
download free cv template,1250,1.9,canva.com/resumes/templates
free printable resume,860,1,canva.com/resumes/templates
resume sample template,620,1.3,canva.com/resumes/templates
resume template free download word,2060,3.4,resume.io/resume-templates
free resume templates for freshers,660,2.5,resume.io/resume-templates
professional cv templates,800,1.3,canva.com/resumes/templates
cv canva,6530,4.5,canva.com/resumes/templates
free downloadable resume templates,1250,1.8,canva.com/resumes/templates
free template cv,720,1,canva.com/resumes/templates
resume templates for experienced,600,1,resume.io/resume-templates
resume for job fresher,700,1,resume.io/resume-templates
standard resume template,1950,1.8,canva.com/resumes/templates
cv format word free download,3110,5,canva.com/resumes/templates
free ats friendly resume templates,950,5.5,resume.io/resume-templates
cv ideas,3200,4.7,canva.com/resumes/templates
resume sample for job,5950,7.2,canva.com/resumes/templates
cv formats templates,820,1,canva.com/resumes/templates
cv template word free,2040,3.9,canva.com/resumes/templates
best free cv templates,630,1,canva.com/resumes/templates
cv format in word,4150,6.6,canva.com/resumes/templates
contoh resume,15080,5.4,canva.com/resumes/templates
cv format for fresher,730,2,resume.io/resume-templates
resume format free,1090,1.4,canva.com/resumes/templates
resume new format,780,1.3,resume.io/resume-templates
ats format resume,10350,12.3,enhancv.com/resume-templates
resume template professional,1000,1.4,canva.com/resumes/templates
resume application form,850,1,resume.io/resume-templates
free resume template downloads,1140,1.9,canva.com/resumes/templates
modern resume template free download,530,1,canva.com/resumes/templates
resume template examples,1960,2.1,canva.com/resumes/templates
cv sample template,1090,1.3,canva.com/resumes/templates
free resume templates pdf,1020,1.7,canva.com/resumes/templates
cv models,1240,1.8,canva.com/resumes/templates
cv template examples,1510,3.9,canva.com/resumes/templates
free resume examples,1840,2.3,canva.com/resumes/templates
modern resume,5520,4.7,resume.io/resume-templates
cv download,2020,2.5,canva.com/resumes/templates
model resume,2420,2.2,canva.com/resumes/templates
formal resume template,1170,1.2,canva.com/resumes/templates
free resume template word,1800,3.9,canva.com/resumes/templates
cv professional,1900,6.5,canva.com/resumes/templates
downloadable free resume templates,1060,2,canva.com/resumes/templates
resume cv format,1060,1.9,resume.io/resume-templates
resume for students with no experience,6010,7.6,resumebuilder.com/resume-templates
resume cv template,900,1.1,canva.com/resumes/templates
ats cv format,7100,13.3,enhancv.com/resume-templates
cv in english template,610,1.1,canva.com/resumes/templates
cv design template,720,1.1,canva.com/resumes/templates
editable resume template,650,1,canva.com/resumes/templates
resume writing templates,870,1.2,canva.com/resumes/templates
downloadable resume template,1100,1.7,canva.com/resumes/templates
resume template malaysia,600,1,canva.com/resumes/templates
best resume templates free,720,1.2,canva.com/resumes/templates
template for writing a resume,810,1.2,canva.com/resumes/templates
design resume templates,550,1,canva.com/resumes/templates
cv pattern,1960,3.9,canva.com/resumes/templates
resume in english,2590,7.6,resume.io/resume-templates
cv for freshers,4560,4.6,resume.io/resume-templates
fresher cv format,1020,4,resume.io/resume-templates
perfect resume,13220,4,myperfectresume.com/resume/templates
ats resume template free download,740,2.8,resume.io/resume-templates
resume fresher,1200,1,resume.io/resume-templates
canva biodata template,800,1,canva.com/resumes/templates
cv forms,640,1.2,canva.com/resumes/templates
sample resume download,740,1.2,resume.io/resume-templates
cv templates word,3060,5.9,canva.com/resumes/templates
free downloadable resume template,1030,1.5,canva.com/resumes/templates
free professional cv template,630,1.1,canva.com/resumes/templates
modern resume format,1790,3.4,resume.io/resume-templates
curriculum vitae template word,2570,4.8,canva.com/resumes/templates
ats friendly resume template free download,750,3.7,resume.io/resume-templates
curriculum vitae example,11120,8.6,canva.com/resumes/templates
format for resume,1160,3.8,resume.io/resume-templates
resume templete,1240,1.1,canva.com/resumes/templates
download cv templates,780,1.5,canva.com/resumes/templates
resume samples for freshers,1310,2,resume.io/resume-templates
ats resume template word free download,1950,3.2,resume.io/resume-templates
cv free download,890,1.7,canva.com/resumes/templates
resume images,3750,4,canva.com/resumes/templates
resume pattern,1230,1.4,canva.com/resumes/templates
latest cv template,690,2.2,canva.com/resumes/templates
resume format for freshers free download,500,1,resume.io/resume-templates
resume template for freshers free download,450,1,resume.io/resume-templates
english cv,5530,19.8,canva.com/resumes/templates
harvard cv template,8850,30.1,canva.com/resumes/templates
resume writing template,940,1.3,canva.com/resumes/templates
enhancecv,11850,1,enhancv.com/resume-templates
cv template professional,830,1.6,canva.com/resumes/templates
downloadable cv template,940,1.8,canva.com/resumes/templates
online resume templates,620,1,canva.com/resumes/templates
internship resume format,490,1,resume.io/resume-templates
resume free template download,710,1.5,resume.io/resume-templates
resume for internship,5890,9.1,resumebuilder.com/resume-templates
official resume format,600,1,resume.io/resume-templates
resume samples,14050,7.7,canva.com/resumes/templates
free download cv template,880,1.4,canva.com/resumes/templates
it resume format,300,1,resume.io/resume-templates
latest resume,570,1.2,resume.io/resume-templates
cv mall,1280,1.9,canva.com/resumes/templates
formal resume,3300,4,canva.com/resumes/templates
free resume format download,440,1,resume.io/resume-templates
it resume templates,1220,2.8,canva.com/resumes/templates
resume format for internship,700,2,resume.io/resume-templates
resume model for job,740,1.5,resume.io/resume-templates
free cv templates word,1700,4,canva.com/resumes/templates
best resume templates for freshers,900,1,resume.io/resume-templates
download free cv templates,990,1.9,canva.com/resumes/templates
resume ideas,6710,14.5,canva.com/resumes/templates
free templates for resumes,460,1,canva.com/resumes/templates
resume format india,500,1,resume.io/resume-templates
download cv template word,2040,5.3,canva.com/resumes/templates
professional resume format for freshers,900,2,resume.io/resume-templates
resume models,740,1.5,canva.com/resumes/templates
cv template for freshers,790,2.2,resume.io/resume-templates
resume examples for job,6150,8.8,canva.com/resumes/templates
resume image,3880,2.3,canva.com/resumes/templates
resume templets,810,1.4,canva.com/resumes/templates
resume example,45630,10.4,canva.com/resumes/templates
harvard style resume,18700,25.2,canva.com/resumes/templates
printable resume templates,540,1,canva.com/resumes/templates
resume sample pdf,3900,7.2,myperfectresume.com/resume/templates
resume templet,890,1.2,canva.com/resumes/templates
best cv format for job,520,4.2,resume.io/resume-templates
cv template for free,790,1.1,canva.com/resumes/templates
downloadable resume templates,320,1.3,canva.com/resumes/templates
free resume templates for word,1350,3.3,canva.com/resumes/templates
resume ground,6040,16.2,myperfectresume.com/resume/templates
resume format for experience,1610,2,enhancv.com/resume-templates
resume formet,820,4,resume.io/resume-templates
resume latest format,570,1.7,resume.io/resume-templates
format of resume for job,1150,1.5,resume.io/resume-templates
proper resume format,2210,9.6,resume.io/resume-templates
canva resume editor,3400,6,canva.com/resumes/templates
simple cv format word free download,2380,5.5,canva.com/resumes/templates
free cv template downloads,570,1,canva.com/resumes/templates
new cv template,580,1.2,canva.com/resumes/templates
new resume templates,430,1,canva.com/resumes/templates
sample resume for job application,1550,3,resume.io/resume-templates
1 year experience resume sample,1810,7.5,enhancv.com/resume-templates
download resume template,700,1.8,canva.com/resumes/templates
english resume,2370,7.8,resume.io/resume-templates
resume simple format,2370,6.7,myperfectresume.com/resume/templates
resume templates for freshers,8460,13.7,resumebuilder.com/resume-templates
resume for job format,630,1.5,resume.io/resume-templates
templates resume,670,1,canva.com/resumes/templates
company resume format,610,2.5,resume.io/resume-templates
cv template australia,960,2.7,canva.com/resumes/templates
one page cv template,1270,2.5,canva.com/resumes/templates
resume best format,350,1,resume.io/resume-templates
resume examples 2025,7800,1,resume.io/resume-templates
resume format fresher,450,1,resume.io/resume-templates
resume format pdf free download,2180,3,enhancv.com/resume-templates
simple resume templates,5150,12.6,resume.io/resume-templates
free online cv templates,520,1,canva.com/resumes/templates
attractive resume format,730,1.5,resume.io/resume-templates
cv resume templates,560,1,canva.com/resumes/templates
free resume sample templates,640,1,canva.com/resumes/templates
writing resume template,630,2.3,canva.com/resumes/templates
free cv download,820,1.6,canva.com/resumes/templates
modele cv,710,4,canva.com/resumes/templates
online resume template free,320,1,canva.com/resumes/templates
resume format in india,450,1,resume.io/resume-templates
cv template free download word,1860,5.2,canva.com/resumes/templates
job biodata format,1460,3.7,resume.io/resume-templates
free resume templates online,490,1,canva.com/resumes/templates
resume word template,3800,5.7,canva.com/resumes/templates
template cv free,2080,1.5,canva.com/resumes/templates
cv for job,4750,22.8,resume.io/resume-templates
cv layout template,530,1.2,canva.com/resumes/templates
sample cv resume,940,2.3,canva.com/resumes/templates
ats cv template free download,1450,4.8,resume.io/resume-templates
best resume templates free download,400,1,resume.io/resume-templates
blank resume pdf,1380,4.4,canva.com/resumes/templates
experience resume template,330,1,canva.com/resumes/templates
free resume templates download word,950,3.1,canva.com/resumes/templates
good cv template,1210,2.7,canva.com/resumes/templates
blank resume format,1020,1.8,canva.com/resumes/templates
resume download pdf,1040,3,myperfectresume.com/resume/templates
canva free cv templates,580,1,canva.com/resumes/templates
modern cv format,1360,3.9,resume.io/resume-templates
experience cv format,430,2.5,resume.io/resume-templates
resume templates free pdf,540,1.2,canva.com/resumes/templates
perfect resume template,560,1,myperfectresume.com/resume/templates
ats free resume templates,490,2.5,resume.io/resume-templates
cv pdf,2820,10.5,canva.com/resumes/templates
cv demo,690,2,canva.com/resumes/templates
cv pdf download,1320,4.8,canva.com/resumes/templates
cv template design,420,1,canva.com/resumes/templates
resume.io templates,550,1,resume.io/resume-templates
resume templates canada,490,2.7,canva.com/resumes/templates
free resume templates samples,650,1.3,canva.com/resumes/templates
resume experience format,1250,5,resume.io/resume-templates
resume sample for fresher,600,2,resume.io/resume-templates
template for resumes,500,1,canva.com/resumes/templates
ats resume template free,1340,4.7,resume.io/resume-templates
resume with experience,400,2.5,resume.io/resume-templates
international cv format,2030,5.8,canva.com/resumes/templates`;

data.seoGoals = csv.trim().split('\n').map(line => {
  const parts = line.split(',');
  const comp = parts.slice(3).join(',').trim();
  return {
    keyword: parts[0].trim(),
    volume: parseInt(parts[1].trim()),
    targetPosition: parseFloat(parts[2].trim()),
    bestCompetitor: comp
  };
});

fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`Written ${data.seoGoals.length} keywords + ${data.topCompetitors.length} competitors to homepage-data.json`);
