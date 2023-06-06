const fs = require('fs')
const util = require('util')
const axios = require('axios')
var Jimp = require('jimp')

const readFile = util.promisify(fs.readFile)

let dl = 0
let toDl = 0

function getfile() {
    fs.readdir(process.argv[3], async function (err, files) {
        if (err) throw new Error('ydk files not founded')
        await downloadDecksByPaths(files)
    })
}

async function downloadDecksByPaths(files) {
    await Promise.all(
        files.map(async (file) => await downloadDeckByPath(file))
    )
}

async function downloadDeckByPath(file) {
    const path = `${file.replace('.ydk', '')}`
    const arr = await getYdkIds(file)

    await downloadPicturesById(arr, path)
}

async function getYdkIds(file) {
    const ydkPath = await readFile(`${process.argv[3]}/${file}`)
    const arr = ydkPath.toString().split('\n')

    let breakYdk = false
    const ydks = arr.reduce((ydkArr, currentPath) => {
        if (process.argv[4] === "--noside" && currentPath === '!side\r') breakYdk = true
        if (breakYdk === true) return ydkArr
        currentPath = parseInt(currentPath)
        if (isNaN(currentPath)) return ydkArr
        const newCardNumber = ydkArr[currentPath] === undefined ? 1 : ydkArr[currentPath] + 1
        return { ...ydkArr, [currentPath]: newCardNumber }
    }, {})

    toDl += Object.keys(ydks).length
    return ydks
}

async function downloadPicturesById(ids, path) {
    await Promise.all(
        Object.keys(ids).map(async id => {
            await downloadPictureById(id, ids[id], path)
        })
    )
}

function delay(ms) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function downloadApiPictureUrl (id) {
    const apiPictureUrl = `https://db.ygoprodeck.com/api_internal/v7/cardinfo.php?id=${id}`
    return await axios.get(apiPictureUrl)
        .catch(async () => {
            await delay(1000)
            return await downloadApiPictureUrl(id)
        })
}

async function downloadPictureById(id, number, directoryPath) {
    const json = await downloadApiPictureUrl(id)
    const pictureUrl = json.data.data[0].card_images[0].image_url
    const name = json.data.data[0].name
    const picturePath = `${process.argv[3]}/decks/${directoryPath}/${number}_${name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`
    const picture = await Jimp.read(pictureUrl)

    switch (process.argv[2]) {
        case '-d':
            picture.write(picturePath)
            break
        case '-c':
            picture
                .resize(421, 614 * 1.07)
                .contain(picture.bitmap.width * 1.11, picture.bitmap.height)
                .contain(picture.bitmap.width, picture.bitmap.height * 1.28)
                .write(picturePath)
            break
    }

    dl++
    console.clear()
    console.log(`downloaded ${dl} / ${toDl} ...`)
    if (dl === toDl) console.log('all cards have been downloaded')
    console.log(picturePath)
}

getfile()
