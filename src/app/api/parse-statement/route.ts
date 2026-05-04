import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('pdf') as File | null

  if (!file || file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDF inválido' }, { status: 400 })
  }

  try {
    const buffer    = Buffer.from(await file.arrayBuffer())
    const { text }  = await pdfParse(buffer)
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Não foi possível ler o PDF. Verifique se o arquivo não está protegido por senha.' }, { status: 422 })
  }
}
