"use client"

import { useEffect, useRef } from "react"

import type { StationBoard } from "@/lib/health/types"

const SPEAKER_STORAGE_KEY = "campuscare-queue-display-speaker"

type AnnouncementItem = {
  station: string
  ticket: string
  label: string
}

function readSpeakerPreference(): boolean {
  if (typeof window === "undefined") return true
  return sessionStorage.getItem(SPEAKER_STORAGE_KEY) !== "off"
}

export function persistSpeakerPreference(on: boolean) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(SPEAKER_STORAGE_KEY, on ? "on" : "off")
}

function formatTicketForSpeech(ticket: string): string {
  return ticket
    .split("")
    .map((char) => {
      if (char === "-") return ", "
      if (/\d/.test(char)) {
        const words = [
          "zero",
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
        ]
        return words[Number(char)] ?? char
      }
      return char
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
}

function buildAnnouncement(label: string, ticket: string): string {
  const spokenTicket = formatTicketForSpeech(ticket)
  return `Now serving ticket ${spokenTicket}. Please proceed to the ${label} station.`
}

function findServingChanges(
  previous: StationBoard[],
  next: StationBoard[]
): AnnouncementItem[] {
  const changes: AnnouncementItem[] = []

  for (const board of next) {
    if (board.status === "on_break" || !board.nowServing) continue
    const prior = previous.find((item) => item.station === board.station)
    if (prior?.nowServing === board.nowServing) continue
    changes.push({
      station: board.station,
      ticket: board.nowServing,
      label: board.label,
    })
  }

  return changes
}

export function useQueueAnnouncements({
  boards,
  speakerOn,
  clinicOnBreak,
}: {
  boards: StationBoard[]
  speakerOn: boolean
  clinicOnBreak: boolean
}) {
  const previousBoardsRef = useRef<StationBoard[]>(boards)
  const isInitialMountRef = useRef(true)
  const announcedRef = useRef<Set<string>>(new Set())
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return

    if (clinicOnBreak || !speakerOn) {
      window.speechSynthesis.cancel()
      queueRef.current = []
      speakingRef.current = false
      return
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      previousBoardsRef.current = boards
      for (const board of boards) {
        if (board.nowServing) {
          announcedRef.current.add(`${board.station}:${board.nowServing}`)
        }
      }
      return
    }

    const changes = findServingChanges(previousBoardsRef.current, boards)
    previousBoardsRef.current = boards

    for (const change of changes) {
      const key = `${change.station}:${change.ticket}`
      if (announcedRef.current.has(key)) continue
      announcedRef.current.add(key)
      queueRef.current.push(buildAnnouncement(change.label, change.ticket))
    }

    const processQueue = () => {
      if (speakingRef.current || queueRef.current.length === 0 || !speakerOn) return
      const text = queueRef.current.shift()
      if (!text) return

      speakingRef.current = true
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.lang = "en-PH"

      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find((voice) => voice.lang.startsWith("en") && !voice.localService) ??
        voices.find((voice) => voice.lang.startsWith("en"))
      if (preferred) utterance.voice = preferred

      const finish = () => {
        speakingRef.current = false
        window.setTimeout(processQueue, 400)
      }

      utterance.onend = finish
      utterance.onerror = finish
      window.speechSynthesis.speak(utterance)
    }

    processQueue()
  }, [boards, speakerOn, clinicOnBreak])
}

export { readSpeakerPreference }
