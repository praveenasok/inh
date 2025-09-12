# Excel File Structure

## Required File Location
`PriceLists/productData.xlsx`

## Sheet Structure

### Main Sheet (Sheet1)
Required columns:
- **Category** - Product category (e.g., "DIY", "Weaves")
- **Product** - Product name
- **Rate** - Product price (numeric)

Optional columns:
- Density, Length, Colors, Standard Weight, Can Be Sold in KG?, PriceList

### Salesmen Sheet (Optional)
Sheet name: "salesmen"
Column A: Salesman names (one per row)

## Example Structure
```
Category | Product | Rate | Density | Length | Colors
DIY      | Bun20   | 300  | DD      | 4      | All Colors
Weaves   | 12"     | 450  | SD      | 12     | Natural
```

## Validation Rules
1. File must exist and not be empty
2. Must contain at least header row + 1 data row
3. Required columns must be present
4. Rate column must contain numeric values
5. No completely empty rows
