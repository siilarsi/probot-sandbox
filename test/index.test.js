const nock = require('nock')
const myProbotApp = require('..')
const { Probot, ProbotOctokit } = require('probot')
const payload = require('./fixtures/issues.opened')
const fs = require('fs')
const path = require('path')

const privateKey = fs.readFileSync(path.join(__dirname, 'fixtures/mock-cert.pem'), 'utf-8')

describe('My Probot app', () => {
  let probot

  beforeEach(() => {
    nock.disableNetConnect()
    probot = new Probot({
      id: 123,
      privateKey,
      Octokit: ProbotOctokit.defaults({
        retry: { enabled: false },
        throttle: { enabled: false }
      })
    })
    probot.load(myProbotApp)
  })

  test('creates a comment when an issue is opened', async () => {
    const encodedContent = Buffer.from(`subscribe: true`).toString('base64')
    const mock = nock('https://api.github.com')
        .post('/app/installations/2/access_tokens')
        .reply(200, {
          token: 'test',
          permissions: {
            issues: 'write'
          }
        })
        .post('/repos/hiimbex/testing-things/issues/1/comments')
        .reply(200)
        .get('/repos/hiimbex/testing-things/contents/.github%2Fsample.yaml')
        .reply(200, {
          type: 'file',
          encoding: 'base64',
          size: encodedContent.length,
          name: 'sample.yaml',
          path: '.github/contents/.github/sample.yaml',
          content: encodedContent
        })

    await probot.receive({ name: 'issues', payload })

    expect(mock.pendingMocks()).toStrictEqual([])
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })
})
