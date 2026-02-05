import React, { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function FAQForm() {
  const [faqs, setFaqs] = useState([{ question: '', answer: '' }])
  const [quantity, setQuantity] = useState(1) // Default quantity

  // Generate quantity options (1 to 20)
  const quantityOptions = Array.from({ length: 20 }, (_, i) => i + 1)

  const handleChange = (
    index: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    const updatedFaqs = [...faqs]
    updatedFaqs[index][field] = value
    setFaqs(updatedFaqs)
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuantity = parseInt(e.target.value)
    setQuantity(newQuantity)
    
    // Update FAQs array based on new quantity
    if (newQuantity > faqs.length) {
      // Add new empty FAQs
      const newFaqs = [...faqs]
      for (let i = faqs.length; i < newQuantity; i++) {
        newFaqs.push({ question: '', answer: '' })
      }
      setFaqs(newFaqs)
    } else if (newQuantity < faqs.length) {
      // Remove extra FAQs
      setFaqs(faqs.slice(0, newQuantity))
    }
  }

  const handleAddFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }])
    setQuantity(faqs.length + 1)
  }

  const handleRemoveFaq = (index: number) => {
    const updatedFaqs = faqs.filter((_, i) => i !== index)
    setFaqs(updatedFaqs)
    setQuantity(updatedFaqs.length)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Submitted ${faqs.length} FAQs!`)
  }

  return (
    <div className=''>
      <Card className='shadow-md'>
        <CardHeader>
          <CardTitle className='text-2xl font-bold'>Add FAQs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="quantity-select">Number of FAQs</Label>
            <select
              id="quantity-select"
              value={quantity}
              onChange={handleQuantityChange}
              className="w-fit rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {quantityOptions.map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          
          <form onSubmit={handleSubmit} className='space-y-6'>
            {faqs.map((faq, index) => (
              <div
                key={index}
                className='relative space-y-4 rounded-lg border p-4'
              >
                <div>
                  <Label htmlFor={`question-${index}`}>
                    Question {index + 1}
                  </Label>
                  <Input
                    id={`question-${index}`}
                    placeholder='Enter your question'
                    value={faq.question}
                    onChange={(e) =>
                      handleChange(index, 'question', e.target.value)
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`answer-${index}`}>
                    Answer {index + 1}
                  </Label>
                  <Textarea
                    id={`answer-${index}`}
                    placeholder='Enter your answer'
                    value={faq.answer}
                    onChange={(e) =>
                      handleChange(index, 'answer', e.target.value)
                    }
                    required
                  />
                </div>

                {faqs.length > 1 && (
                  <Button
                    type='button'
                    variant='destructive'
                    size='sm'
                    onClick={() => handleRemoveFaq(index)}
                    className='absolute top-2 right-2 flex items-center gap-1'
                  >
                    <Trash2 className='h-4 w-4' /> Remove
                  </Button>
                )}
              </div>
            ))}
            <div className='flex justify-between'>
              <Button
                type='button'
                variant='outline'
                onClick={handleAddFaq}
                className='flex items-center gap-2'
              >
                <Plus className='h-4 w-4' /> Add More FAQ
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
