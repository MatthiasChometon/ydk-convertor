const https = require('https')
const fs = require('fs')
const util = require('util')
const axios = require('axios')

const readFile = util.promisify(fs.readFile)
const mkdir = util.promisify(fs.mkdir)

async function getfile() {
    fs.readdir(process.argv[2], async function (err, files) {
        if(err) throw new Error('ydk files not founded')
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
    const arr = ydkPath.toString().replace(/[^0-9]+/g, '\n').split('\n')
    console.log('card ids founded')
    return arr
}

async function downloadPicturesById(ids, path) {
    await Promise.all(
        ids.map(id => downloadPictureById(id, path))
    )
}

async function downloadPictureById(id, directoryPath) {
    if (id === '') return
    const json = await axios.get(`https://db.ygoprodeck.com/api_internal/v7/cardinfo.php?id=${id}`)
    const pictureUrl = json.data.data[0].card_images[0].image_url
    const name = json.data.data[0].name

    https.get(pictureUrl, (picture) => {
        const picturePath = `${directoryPath}/${name.replace(/[^a-zA-Z0-9]/g, '')}.jpg`
        const file = fs.createWriteStream(picturePath)
        picture.pipe(file)
        console.log(picturePath)
    })
}

getfile()
