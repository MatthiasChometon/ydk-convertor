const https = require('https')
const fs = require('fs')
const util = require('util')
const axios = require('axios')
var Jimp = require('jimp')

const readFile = util.promisify(fs.readFile)

async function getfile() {
    fs.readdir(process.argv[3], async function (err, files) {
        if (err) throw new Error('ydk files not founded')
        console.log('ydk files founded')
        downloadDecksByPaths(files)
    })
}

async function downloadDecksByPaths(files) {
    await Promise.all(
        files.map(async (file) => downloadDeckByPath(file))
    )
}

async function downloadDeckByPath(file) {
    const path = `${file.replace('.ydk', '')}`
    const arr = await getYdkIds(file)

    downloadPicturesById(arr, path)
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

    console.log('card ids founded')
    return ydks
}

async function downloadPicturesById(ids, path) {
    await Promise.all(
        Object.keys(ids).map(id => {
            downloadPictureById(id, ids[id], path)
        })
    )
}

async function downloadPictureById(id, number, directoryPath) {
    const json = await axios.get(`https://db.ygoprodeck.com/api_internal/v7/cardinfo.php?id=${id}`)
        .catch(err => err)

    if (json.status === undefined) return
    const pictureUrl = json.data.data[0].card_images[0].image_url
    const name = json.data.data[0].name
    const picturePath = `${process.argv[3]}/decks/${directoryPath}/${number}_${name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`
    let error = false

    const picture = await Jimp.read(pictureUrl)
        .catch(() => error = true)

    switch (process.argv[2]) {
        case '-d':
            if (!error) picture.write(picturePath)
            break
        case '-c':
            if (!error) {
                picture
                    .resize(picture.bitmap.width, picture.bitmap.height * 1.07)
                    .contain(picture.bitmap.width * 1.11, picture.bitmap.height)
                    .contain(picture.bitmap.width, picture.bitmap.height * 1.28)
                    .write(picturePath)
            }
            break
    }

    console.log(picturePath)
}

getfile()
