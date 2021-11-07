const https = require('https')
const fs = require('fs')
const util = require('util')
const axios = require('axios')
var Jimp = require('jimp')

const readFile = util.promisify(fs.readFile)
const mkdir = util.promisify(fs.mkdir)

async function getfile() {
    fs.readdir(process.argv[2], async function (err, files) {
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

    const [arr] = await Promise.all([
        getYdkIds(file),
        createDirectories(path)
    ])

    downloadPicturesById(arr, path)
}

async function createDirectories(path) {
    mkdir(path, { recursive: true })
    console.log('create directory')
}

async function getYdkIds(file) {
    const ydkPath = await readFile(`${process.argv[2]}/${file}`)
    const arr = ydkPath.toString().split('\n')

    const ydks = arr.reduce((ydkArr, currentPath) => {
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
        .catch(err => console.log(err))
    const pictureUrl = json.data.data[0].card_images[0].image_url
    const name = json.data.data[0].name
    const picturePath = `${directoryPath}/${number}_${name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`

    const picture = await Jimp.read(pictureUrl)
        .catch(err => {
            console.error(err)
        })
    picture
        .contain(2100, 2000)
        .contain(2000, 2300)
        .write(picturePath)
    console.log(picturePath)
}

getfile()
