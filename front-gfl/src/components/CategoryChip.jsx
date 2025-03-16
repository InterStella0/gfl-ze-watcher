import { Chip } from "@mui/material"

const CATEGORY_PLAYER = {
    'casual': 'success',
    'tryhard': 'error',
    'mixed': 'primary'
}

export default function CategoryChip({ category, ...other }){
    return <Chip label={category} color={CATEGORY_PLAYER[category]} {...other} />
}