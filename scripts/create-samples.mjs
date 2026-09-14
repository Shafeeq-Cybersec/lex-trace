import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import fs from 'node:fs';
const dir=new URL('../public/samples/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
async function pdf(name,title,lines){const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);const page=doc.addPage([595,842]);page.drawText('TRACE / SYNTHETIC DEMONSTRATION RECORD',{x:42,y:795,size:10,font,color:rgb(.25,.4,.34)});page.drawText(title,{x:42,y:755,size:20,font});lines.forEach((text,i)=>page.drawText(text,{x:42,y:710-i*25,size:11,font}));await fs.promises.writeFile(new URL(name,dir),await doc.save());}
await pdf('01-deduction-notice.pdf','Deposit return statement',[
'Entirely fictional case. No real people or property.',
'From: Morgan, landlord. To: Alex, renter. Date: 2026-08-12.',
'Security deposit received: INR 60000.',
'Proposed deductions: living room repainting INR 12000;',
'professional cleaning INR 3000. Proposed refund: INR 45000.',
'Landlord statement: The living room marks were new at move-out.',
'Landlord statement: The kitchen required cleaning.',
'No invoices or payment confirmations are attached.'
]);
await pdf('02-move-in-inspection.pdf','Move-in inspection',[
'Entirely fictional case. Inspection date: 2025-08-01.',
'Living room: two dark marks recorded on the north wall.',
'Kitchen: surfaces clean. No grease recorded.',
'Recorded by the letting agent. Renter acknowledged receipt.',
'This record describes move-in condition, not move-out condition.'
]);
fs.writeFileSync(new URL('03-renter-messages.txt',dir),`SYNTHETIC DEMONSTRATION RECORD
2026-08-13 10:00 - Alex (renter): I disagree that all the living room marks were new. The move-in inspection recorded two dark marks. I am asking for the cleaning invoice and the painting invoice.
2026-08-13 10:10 - Morgan (landlord): I will look for the invoices.
These are fictional transcribed messages; identities and timestamps are not authenticated.
`);
fs.writeFileSync(new URL('04-new-packing-message.txt',dir),`SYNTHETIC DEMONSTRATION RECORD — upload AFTER the first review.
2026-08-10 18:15 - Alex (renter): While moving my desk I made an additional mark near the living room door. It is separate from the two old marks on the north wall. I do not know the repair cost.
This fictional message does not establish that repainting the entire room was necessary or what it cost.
`);
fs.writeFileSync(new URL('05-irrelevant-record.txt',dir),'SYNTHETIC DEMONSTRATION RECORD\n2026-08-08 - Alex: I returned the library book. This record has no connection to the rental property or deposit.\n');
console.log('Created five clearly labeled synthetic sample records.');
