/** Generate one synthetic, text-searchable PDF entirely in memory. */
export function makeSyntheticPDF() {
 const objects=[];
 objects[1]="<< /Type /Catalog /Pages 2 0 R >>";
 objects[2]="<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
 objects[3]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>";
 objects[4]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
 const stream="BT /F1 20 Tf 55 725 Td (FilingProof Synthetic Demonstration) Tj /F1 11 Tf 0 -36 Td (A synthetic document for testing only.) Tj 0 -22 Td (No court data, personal records, or actual legal content.) Tj ET\n";
 objects[5]="<< /Length "+new TextEncoder().encode(stream).length+" >>\nstream\n"+stream+"endstream";
 let pdf="%PDF-1.4\n% FilingProof synthetic sample\n";
 const offsets=[0];
 for(let i=1;i<=5;i++){offsets.push(new TextEncoder().encode(pdf).length);pdf+=i+" 0 obj\n"+objects[i]+"\nendobj\n";}
 const xrefOffset=new TextEncoder().encode(pdf).length;
 pdf+="xref\n0 6\n0000000000 65535 f \n";
 for(let i=1;i<=5;i++)pdf+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 pdf+="trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n"+xrefOffset+"\n%%EOF\n";
 return new File([new TextEncoder().encode(pdf)],"synthetic-filingproof-demo.pdf",{type:"application/pdf"});
}
