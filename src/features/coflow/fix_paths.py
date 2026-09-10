import os

directory = '/Users/monicablanco/Documents/GitHub/CR8WDashVfin/src/features/coflow/components'
for filename in os.listdir(directory):
    if filename.endswith(".tsx"):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r') as f:
            content = f.read()
        content = content.replace('../../app/components/api', '@/app/components/api')
        content = content.replace('../../app/components/data', '@/app/components/data')
        with open(filepath, 'w') as f:
            f.write(content)

utils_path = '/Users/monicablanco/Documents/GitHub/CR8WDashVfin/src/features/coflow/utils.ts'
with open(utils_path, 'r') as f:
    content = f.read()
content = content.replace('../../app/components/api', '@/app/components/api')
with open(utils_path, 'w') as f:
    f.write(content)

view_path = '/Users/monicablanco/Documents/GitHub/CR8WDashVfin/src/app/components/CoFlowD8sView.tsx'
with open(view_path, 'r') as f:
    content = f.read()
content = content.replace('../../features/coflow', '@/features/coflow')
with open(view_path, 'w') as f:
    f.write(content)

print("Paths updated!")
