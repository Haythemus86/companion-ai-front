<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
const canvas = ref<HTMLCanvasElement>();
let frame = 0;
let pointer = 0;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function draw(time: number) {
  const context = canvas.value?.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, 560, 270);
  context.fillStyle = "#edf4ef";
  context.fillRect(0, 0, 560, 270);
  const blink = reduced
    ? 1
    : Math.max(0.09, Math.min(1, Math.abs((time % 5200) - 2600) / 85));
  for (const center of [181, 379]) {
    context.save();
    context.translate(center, 130);
    context.scale(1, blink);
    context.beginPath();
    context.moveTo(-72, 0);
    context.bezierCurveTo(-50, -65, 42, -65, 72, 0);
    context.bezierCurveTo(38, 59, -48, 59, -72, 0);
    context.fillStyle = "#213d31";
    context.fill();
    context.clip();
    context.beginPath();
    context.arc(
      pointer + (reduced ? 0 : Math.sin(time / 1800) * 9),
      0,
      33,
      0,
      Math.PI * 2,
    );
    context.fillStyle = "#a8ddb3";
    context.fill();
    context.beginPath();
    context.arc(pointer + 9, -10, 8, 0, Math.PI * 2);
    context.fillStyle = "#fff";
    context.fill();
    context.restore();
  }
  if (!reduced) frame = requestAnimationFrame(draw);
}
onMounted(() => {
  frame = requestAnimationFrame(draw);
});
onUnmounted(() => cancelAnimationFrame(frame));
</script>

<template>
  <canvas
    ref="canvas"
    width="560"
    height="270"
    class="eyes-canvas"
    role="img"
    aria-label="Aperçu animé de deux yeux amande verts"
    @pointermove="
      pointer =
        ($event.offsetX / ($event.currentTarget as HTMLElement).clientWidth -
          0.5) *
        28
    "
    @pointerleave="pointer = 0"
  ></canvas>
</template>
