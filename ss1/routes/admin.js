const express = require('express')
const router = express.Router()


const bcrypt = require('bcrypt')
const sharp = require('sharp')


const fs = require('fs')

const db = require('../db')


const multer = require('multer')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, global.basedir + '/public/pics/tmp')
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.substring(file.mimetype.indexOf('/') + 1)
        cb(null, Date.now() + '.' + ext)
    }
})  
const upload = multer({storage: storage})


// FUNCTIONS AND MIDDLEWARES
async function findUser(id) {
    return await db.get().collection('users').findOne({id: id});
}

async function getAllSubjects() {
    const teachers = []
    const teacherCursor = await db.get().collection('users').find({type: 1})
    while (await teacherCursor.hasNext()) {
        const teacher = await teacherCursor.next()
        teachers.push(teacher)
    }

    const classes = []
    const classCursor = await db.get().collection('classes').find({})
    while (await classCursor.hasNext()) {
        const Class = await classCursor.next()
        classes.push(Class)
    }

    const rooms = []
    const roomCursor = await db.get().collection('rooms').find({})
    while (await roomCursor.hasNext()) {
        const room = await roomCursor.next()
        rooms.push(room)
    }

    return {teachers: teachers, classes: classes, rooms: rooms}
}

async function checkAppoint(att) {
    // Return true if time1 comes before time2 in the same day (E.g: 9:00 stands before 11:00)
    const standBefore = (time1, time2) => {
        const s1 = time1.indexOf(':'), s2 = time2.indexOf(':') // Split

        const h1 = Number(time1.substring(0, s1)), h2 = Number(time2.substring(0, s2)) // Hour

        if (h1 < h2)
            return true
        else if (h1 === h2) {
            const m1 = Number(time1.substring(s1 + 1)), m2 = Number(time2.substring(s2 + 1)) // Minute
            return m1 <= m2
        } else
            return false
    }

    const start = att.start, end = att.end, date = att.date

    if (!start || !end || !date)
        return 5

    if (start === end || !standBefore(start, end))
        return 1

    // For a teacher, at the date, if there is appointment then check time collision
    const teacherId = Number(att.teacherId)
    const teacherAppointCursor = await db.get().collection('appoints').find({teacherId: teacherId, date: date})

    const teacherAppoints = []
    while (await teacherAppointCursor.hasNext()) {
        const teacherAppoint = await teacherAppointCursor.next()
        teacherAppoints.push(teacherAppoint)
    }

    for (const teacherAppoint of teacherAppoints) {
        if (standBefore(end, teacherAppoint.start) || standBefore(teacherAppoint.end, start))
            continue
        return 2
    }

    // For a class, at the date, if there is appointment then check time collision
    const classId = Number(att.classId)
    const classAppointCursor = await db.get().collection('appoints').find({classId: classId, date: date})

    const classAppoints = []
    while (await classAppointCursor.hasNext()) {
        const classAppoint = await classAppointCursor.next()
        classAppoints.push(classAppoint)
    }

    for (const classAppoint of classAppoints) {
        if (standBefore(end, classAppoint.start) || standBefore(classAppoint.end, start))
            continue
        return 3
    }

    // For a room, at the date, if there is appointment then check time collision
    const roomId = Number(att.roomId)
    const roomAppointCursor = await db.get().collection('appoints').find({roomId: roomId, date: date})

    const roomAppoints = []
    while (await roomAppointCursor.hasNext()) {
        const roomAppoint = await roomAppointCursor.next()
        roomAppoints.push(roomAppoint)
    }

    for (const roomAppoint of roomAppoints) {
        if (standBefore(end, roomAppoint.start) || standBefore(roomAppoint.end, start))
            continue
        return 4
    }

    return 0
}

async function checkAppointEdit(att, id) {
    // Return true if time1 comes before time2 in the same day (E.g: 9:00 stands before 11:00)
    const standBefore = (time1, time2) => {
        const s1 = time1.indexOf(':'), s2 = time2.indexOf(':') // Split

        const h1 = Number(time1.substring(0, s1)), h2 = Number(time2.substring(0, s2)) // Hour

        if (h1 < h2)
            return true
        else if (h1 === h2) {
            const m1 = Number(time1.substring(s1 + 1)), m2 = Number(time2.substring(s2 + 1)) // Minute
            return m1 <= m2
        } else
            return false
    }

    const start = att.start, end = att.end, date = att.date

    if (!start || !end || !date)
        return 5

    if (start === end || !standBefore(start, end))
        return 1

    // For a teacher, at the date, if there is appointment then check time collision
    const teacherId = Number(att.teacherId)
    const teacherAppointCursor = await db.get().collection('appoints').find({teacherId: teacherId, date: date, id: {$ne: id}})

    const teacherAppoints = []
    while (await teacherAppointCursor.hasNext()) {
        const teacherAppoint = await teacherAppointCursor.next()
        teacherAppoints.push(teacherAppoint)
    }

    for (const teacherAppoint of teacherAppoints) {
        if (standBefore(end, teacherAppoint.start) || standBefore(teacherAppoint.end, start))
            continue
        return 2
    }

    // For a class, at the date, if there is appointment then check time collision
    const classId = Number(att.classId)
    const classAppointCursor = await db.get().collection('appoints').find({classId: classId, date: date, id: {$ne: id}})

    const classAppoints = []
    while (await classAppointCursor.hasNext()) {
        const classAppoint = await classAppointCursor.next()
        classAppoints.push(classAppoint)
    }

    for (const classAppoint of classAppoints) {
        if (standBefore(end, classAppoint.start) || standBefore(classAppoint.end, start))
            continue
        return 3
    }

    // For a room, at the date, if there is appointment then check time collision
    const roomId = Number(att.roomId)
    const roomAppointCursor = await db.get().collection('appoints').find({roomId: roomId, date: date, id: {$ne: id}})

    const roomAppoints = []
    while (await roomAppointCursor.hasNext()) {
        const roomAppoint = await roomAppointCursor.next()
        roomAppoints.push(roomAppoint)
    }

    for (const roomAppoint of roomAppoints) {
        if (standBefore(end, roomAppoint.start) || standBefore(roomAppoint.end, start))
            continue
        return 4
    }

    return 0
}

//PERSONAL OPERATIONS

router.get('/', (req, res) => {
    res.redirect('/admin/view')
})


router.get('/view', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    let msg = null
    switch(Number(req.query.suc)) {
        case 0:
            msg = 'Success in edit info.'
            break
        case 1:
            msg = 'Success in edit picture.'
            break
    }

    return res.render('common/view', {title: 'Admin / View', user: user, msg: msg})
})


router.get('/edit/info', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    let msg = null
    if (req.query.err)
        msg = 'Duplicated Email.'

    return res.render('common/editInfo', {title: 'Admin / Edit Info', user: user, msg: msg})
})


router.post('/edit/info/:id', async (req, res) => {
    const email = req.body.email
    const id = Number(req.params.id)

    const duplicateEmail = await db.get().collection('users').findOne({id: {$ne: id}, email: email})

    if (duplicateEmail)
        return res.redirect('/admin/edit/info?err=0')

    const name = req.body.name
    
    let updates = null;
    if (req.body.password) {
        const newPassword = await bcrypt.hash(req.body.password, 10)
        updates = {
            $set: {
                name: name,
                email: email,
                password: newPassword
            }
        }
    } else
        updates = {
            $set: {
                name: name,
                email: email
            }
        }

    const updatedDoc = await db.get().collection('users').findOneAndUpdate({id: id}, updates)

    if (updatedDoc.ok === 1)
        return res.redirect('/admin/view?suc=0')
})


router.get('/edit/picture', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    let msg = null
    switch(Number(req.query.err)) {
        case 0:
            msg = 'No file was provided.'
            break
        case 1:
            msg = 'Wrong extension of file.'
            break
    }

    return res.render('common/editPicture', {title: 'Admin / Edit Picture', user: user, msg: msg})
})


router.post('/edit/picture/:id', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file)
        return res.redirect('/admin/edit/picture?err=0')

    if (file.mimetype !== 'image/jpeg') {
        fs.unlink(global.basedir + '/public/pics/tmp/' + file.filename, (err) => {if (err) throw err})
        return res.redirect('/admin/edit/picture?err=1')
    }

    await sharp(file.path)
        .resize(250, 250)
        .toFile(global.basedir +  '/public/pics/save/' + file.filename, async () => {
            const id = Number(req.params.id)
            const updatedDoc = await db.get().collection('users').findOneAndUpdate(
                {
                    id: id
                }, 
                {
                    $set: {
                        pic: file.filename
                    }
                }
            )

            fs.unlink(global.basedir + '/public/pics/tmp/' + file.filename, (err) => {if (err) throw err})

            if (updatedDoc.ok === 1)
                res.redirect('/admin/view?suc=1')
        })
})


// TEACHER OPERATIONS

router.get('/teacher', (req, res) => {
    return res.redirect('/admin/teacher/index')
})


router.get('/teacher/index', async (req, res) => {

    const user = await findUser(Number(req.cookies.id))

    const teacherCursor = await db.get().collection('users').find({type: 1})
    const teachers = []

    while (await teacherCursor.hasNext()) {
            const teacher = await teacherCursor.next()
            teachers.push(teacher)
    }

    let msgTeacherCreate = null
    let msgTeacherList = null

    switch(Number(req.query.coc)) {
        case 0:
            msgTeacherCreate = 'Success: Create a new teacher.'
            break
        case 1:
            msgTeacherCreate = 'Failure: Duplicated email.'
            break
    }

    switch(Number(req.query.cod)) {
        case 0:
            msgTeacherList = 'Success: Remove a teacher.'
            break
    }

    res.render('admin/teacherIndex', {
        title: 'Admin / Teacher Index', 
        user: user,
        teachers: teachers, 
        msgTeacherCreate: msgTeacherCreate, 
        msgTeacherList: msgTeacherList
    })
})


router.post('/teacher/create', async (req, res, next) => {

    const email = req.body.email
    const duplicateEmail = await db.get().collection('users').findOne({email: email});

    if (duplicateEmail)
        return res.redirect('/admin/teacher/index?coc=1')
    
    next()

}, async (req, res) => {

    const updatedCounter = await db.get().collection('counters').findOneAndUpdate({subject: 'user'}, {$inc: {counter: 1}}, {returnOriginal: false})
    const password = await bcrypt.hash('teacher123', 10)

    const insertedTeacher = await db.get().collection('users').insertOne({
        id: updatedCounter.value.counter,
        name: req.body.name,
        email: req.body.email,
        password: password,
        pic: 'teacher.jpeg',
        type: 1
    })

    if (insertedTeacher.result.ok === 1)
        return res.redirect('/admin/teacher/index?coc=0')
})


router.get('/teacher/:id', async (req, res) => {

    const teacherId = Number(req.params.id)

    const user = await findUser(Number(req.cookies.id))
    const teacher = await findUser(teacherId)

    const appointCursor = await db.get().collection('appoints').find({teacherId: teacherId})
    const appoints = []

    while (await appointCursor.hasNext()) {
        const appoint = await appointCursor.next()
        appoints.push(appoint)
    }

    let msgTeacherAppoint = null

    return res.render('admin/teacherView', {
        title: 'Admin / Teacher View', 
        user: user, 
        teacher: teacher,
        appoints: appoints,
        msgTeacherAppoint: msgTeacherAppoint
    })
})


router.post('/teacher/:id/delete', async (req, res) => {

    const id = Number(req.params.id)

    const deletedTeacher = await db.get().collection('users').deleteOne({id: id})
    const removedAppoints = await db.get().collection('appoints').deleteMany({teacherId: id})

    if (deletedTeacher.result.ok === 1 && removedAppoints.result.ok === 1)
        return res.redirect('/admin/teacher/index?cod=0')
})


// APPOINT OPERATIONS

router.get('/appoint', (req, res) => {
    return res.redirect('/admin/appoint/index')
})


router.get('/appoint/index', async (req, res) => {
    const user = await findUser(Number(req.cookies.id))

    const subjects = await getAllSubjects();

    const appoints = []
    const appointCursor = await db.get().collection('appoints').find({})

    while (await appointCursor.hasNext()) {
        const appoint = await appointCursor.next()
        appoints.push(appoint)
    }

    let msgAppointCreate = null
    let msgAppointList = null

    switch(Number(req.query.coc)) {
        case 0:
            msgAppointCreate = 'A new appointment created successfully.'
            break
        case 1:
            msgAppointCreate = 'Start time must come before end time'
            break
        case 2:
            msgAppointCreate = 'The teacher has taught something in this time.'
            break
        case 3:
            msgAppointCreate = 'The class has been taught by other teacher in this time'
            break
        case 4:
            msgAppointCreate = 'The room has been taken in this time'
            break
        case 5:
            msgAppointCreate = 'Some fields are left empty.'
            break
    }

    switch(Number(req.query.cod)) {
        case 0:
            msgAppointList = 'The appointment has been deleted successfully'
            break
    }

    switch(Number(req.query.coe)) {
        case 0:
            msgAppointList = 'The appointment has been edited successfully.'
            break
    }

    return res.render('admin/appointIndex', {
        title: 'Admin / Appoint Index',
        user: user,
        teachers: subjects.teachers,
        classes: subjects.classes,
        rooms: subjects.rooms,
        appoints: appoints,
        msgAppointCreate: msgAppointCreate,
        msgAppointList: msgAppointList
    })
})


router.post('/appoint/create', async (req, res) => {
    
    const collideCheck = await checkAppoint(req.body)

    if (collideCheck !== 0)
        return res.redirect('/admin/appoint/index?coc=' + collideCheck)

    const updatedCounter = await db.get().collection('counters').findOneAndUpdate({subject: 'appoint'}, {$inc: {counter: 1}}, {returnOriginal: true})

    const teacherId = Number(req.body.teacherId)
    const classId = Number(req.body.classId)
    const roomId = Number(req.body.roomId)

    const teacher = await db.get().collection('users').findOne({id: teacherId}, {projection:{name:1}})
    const Class = await db.get().collection('classes').findOne({id: classId}, {projection: {name: 1}})
    const room = await db.get().collection('rooms').findOne({id: roomId}, {projection: {name: 1}})

    const insertedAppoint = await db.get().collection('appoints').insertOne(
        {
            id: updatedCounter.value.counter,
            teacherId: teacherId,
            teacherName: teacher.name,
            classId: classId,
            className: Class.name,
            roomId: roomId,
            roomName: room.name,
            start: req.body.start,
            end: req.body.end,
            date: req.body.date
        }
    )

    if (insertedAppoint.result.ok === 1)
        return res.redirect('/admin/appoint/index?coc=0')
})


router.get('/appoint/:id', async (req, res) => {

    const user = await findUser(Number(req.cookies.id))

    const subjects = await getAllSubjects()
    const appoint = await db.get().collection('appoints').findOne({id: Number(req.params.id)})

    let msgAppointEdit = null
    switch(Number(req.query.coe)) {
        case 0:
            msgAppointEdit = 'Successfully edited.'
            break
        case 1:
            msgAppointEdit = 'Start time must preceed end time'
            break
        case 2:
            msgAppointEdit = 'The teacher has taught something in this time.'
            break
        case 3:
            msgAppointEdit = 'The class has been taught by other teacher in this time'
            break
        case 4:
            msgAppointEdit = 'The room has been taken in this time'
            break
    }

    return res.render('admin/appointEdit', {
        title: 'Admin / Appoint Edit',
        user: user,
        appoint: appoint,
        teachers: subjects.teachers,
        classes: subjects.classes,
        rooms: subjects.rooms,
        msgAppointEdit: msgAppointEdit
    })
})


router.post('/appoint/:id/edit', async (req, res) => {

    const id = Number(req.params.id)
    const validAppoint = await checkAppointEdit(req.body, id)

    if (validAppoint !== 0)
        return res.redirect('/admin/appoint/:id?coe=' + validAppoint)

    const teacherId = Number(req.body.teacherId)
    const classId = Number(req.body.classId)
    const roomId = Number(req.body.roomId)

    const teacher = await db.get().collection('users').findOne({id: teacherId}, {projection:{name:1}})
    const Class = await db.get().collection('classes').findOne({id: classId}, {projection: {name: 1}})
    const room = await db.get().collection('rooms').findOne({id: roomId}, {projection: {name: 1}})

    const replacement = {
        id: id,
        teacherId: teacherId,
        teacherName: teacher.name,
        classId: classId,
        className: Class.name,
        roomId: roomId,
        roomName: room.name,
        start: req.body.start,
        end: req.body.end,
        date: req.body.date,
    }

    const replacedAppoint = await db.get().collection('appoints').findOneAndReplace({id: id}, replacement)

    if (replacedAppoint.ok === 1)
        return res.redirect('/admin/appoint/index?coe=0')
})


router.post('/appoint/:id/delete', async (req, res) => {
    
    const id = Number(req.params.id)
    const deletedAppoint = await db.get().collection('appoints').deleteOne({id: id})

    if (deletedAppoint.result.ok == 1)
        return res.redirect('/admin/appoint/index?cod=0')
})

module.exports = router