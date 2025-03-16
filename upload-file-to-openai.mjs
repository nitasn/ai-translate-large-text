import { exec } from 'child_process';

/**
 * resolves to `id` of the uploaded file.
 */
export default async function uploadFile(filepath) {
  const response = await new Promise((resolve, reject) => {
    const command = `curl.exe https://api.openai.com/v1/files -F "file=@${filepath}" -F "purpose=user_data" -H "Authorization: Bearer ${process.env.OPEN_AI_KEY}"`;
    exec(command, (error, stdout) => {
      if (error) return reject(`Error: ${error.message}`);
      resolve(stdout);
    });
  });

  return JSON.parse(response).id;
}

console.log(await uploadFile("input.txt"))