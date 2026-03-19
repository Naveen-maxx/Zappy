-- Allow hosts to score answers by updating participant_answers (is_correct, points_earned)

CREATE POLICY "Hosts can score participant answers"
ON public.participant_answers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE game_rooms.id = participant_answers.room_id
      AND game_rooms.host_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.game_rooms
    WHERE game_rooms.id = participant_answers.room_id
      AND game_rooms.host_id = auth.uid()
  )
);
