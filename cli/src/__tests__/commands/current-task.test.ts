import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { handleCurrentTaskCommand } from '../../commands/current-task'

describe('current-task command', () => {
  describe('link subcommand', () => {
    const originalFetch = global.fetch
    const originalEnv = process.env.FULCRUM_TASK_ID

    const TASK_ID = 'test-task-id-1234'
    const TASK_RESPONSE = {
      id: TASK_ID,
      title: 'Test Task',
      status: 'IN_PROGRESS',
      worktreePath: '/tmp/test-worktree',
    }
    const LINK_RESPONSE = {
      id: 'link-id-1',
      taskId: TASK_ID,
      url: 'https://example.com',
      label: 'Example',
      type: 'other',
      createdAt: new Date().toISOString(),
    }

    beforeEach(() => {
      process.env.FULCRUM_TASK_ID = TASK_ID
    })

    afterEach(() => {
      global.fetch = originalFetch
      if (originalEnv !== undefined) {
        process.env.FULCRUM_TASK_ID = originalEnv
      } else {
        delete process.env.FULCRUM_TASK_ID
      }
    })

    test('link URL is not used as server URL', async () => {
      const fetchedUrls: string[] = []

      global.fetch = mock((input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        fetchedUrls.push(url)

        // Return task for getTask call
        if (url.includes(`/api/tasks/${TASK_ID}`) && !url.includes('/links')) {
          return Promise.resolve(new Response(JSON.stringify(TASK_RESPONSE), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }))
        }

        // Return link for addTaskLink call
        if (url.includes('/links')) {
          return Promise.resolve(new Response(JSON.stringify(LINK_RESPONSE), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }))
        }

        return Promise.resolve(new Response('Not Found', { status: 404 }))
      }) as typeof fetch

      await handleCurrentTaskCommand('link', ['https://example.com'], {})

      // All fetch calls should go to the default server, NOT to https://example.com
      for (const url of fetchedUrls) {
        expect(url).not.toStartWith('https://example.com/api')
      }
      expect(fetchedUrls.length).toBeGreaterThan(0)
    })
  })
})
