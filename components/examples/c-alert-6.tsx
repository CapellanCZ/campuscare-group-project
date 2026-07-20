import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { IconCircleCheck } from "@tabler/icons-react"

export function Pattern() {
  return (
    <Alert variant="success">
      <IconCircleCheck
      />
      <AlertTitle>Success! All good</AlertTitle>
      <AlertDescription>
        Everything is working as expected. You can continue with your task.
      </AlertDescription>
    </Alert>
  )
}