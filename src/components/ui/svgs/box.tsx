import type { SVGProps } from "react"

const Box = (props: SVGProps<SVGSVGElement>) => (
  <svg {...props} viewBox="0 0 64 40">
    <text
      x="1"
      y="29"
      fill="#0061D5"
      fontFamily="Arial, Helvetica, sans-serif"
      fontSize="30"
      fontWeight="700"
      letterSpacing="0"
    >
      box
    </text>
  </svg>
)

export { Box }