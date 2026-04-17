import fs from 'fs';
import path from 'path';

const formsDir = path.join(process.cwd(), 'schemas', 'forms');
const registryFile = path.join(formsDir, 'index.ts');

const files = fs.readdirSync(formsDir).filter(f => f.endsWith('.json'));

let out = `export const forms_registry: Record<string, any> = {\n`;

const stub = {"type":"form-container","props":{"title":"Module Under Construction","description":"This operation is part of the legacy GTL schema and is currently being ported to the new Keystone-UI architecture.","fields":[{"name":"acknowledgement","label":"Acknowledge Porting Status","type":"checkbox"}],"actions":[{"id":"close","label":"Close","variant":"outline","submitAction":false}]}};

const stubString = JSON.stringify(stub);

for (const file of files) {
   const key = file.replace('.json', '');
   const content = JSON.parse(fs.readFileSync(path.join(formsDir, file), 'utf8'));
   
   // If it's a generated form from our AST mapper, it will have a specific structure.
   // Instead of importing them dynamically which breaks our serverless build structure for the forms registry currently,
   // we serialize the built form directly into the registry for now to maintain drop-in compatibility.
   
   if (content.fields && content.fields[0] && content.fields[0].name !== 'acknowledgement') {
       out += `    '${key}': ${JSON.stringify({ type: 'form-container', props: content })},\n`;
   } else {
       out += `    '${key}': ${stubString},\n`;
   }
}

out += `};\n`;

fs.writeFileSync(registryFile, out);
console.log('Rewrote forms registry.');
