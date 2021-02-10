const button = document.getElementById('generateNewBackup')

button.addEventListener('click', async () => {
  const { body } = await fetch('/generate')
  const reader = body.getReader()
  const content = await reader.read()
  const decoder = new TextDecoder()
  const uri = decoder.decode(content.value)

  window.open(uri)
})