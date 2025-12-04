export class TypeformService {
  private apiToken: string;
  private formId: string;

  constructor() {
    this.apiToken = process.env.TYPEFORM_API_TOKEN || '';
    this.formId = process.env.NEXT_PUBLIC_TYPEFORM_FORM_ID || '';
  }

  async submitResponse(rating: number, email: string): Promise<boolean> {
    try {
      console.log('[Typeform] Attempting to submit:', { rating, email, formId: this.formId });

      const response = await fetch(
        `https://api.typeform.com/forms/${this.formId}/responses`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            response_id: `resp_${Date.now()}`,
            landed_at: new Date().toISOString(),
            submitted_at: new Date().toISOString(),
            answers: [
              {
                field: {
                  id: 'RYyVMh7I6Cb2',
                  type: 'rating',
                  ref: '01HN3C3YSZ8GTGG2CS3E4046BY',
                },
                type: 'number',
                number: rating,
              },
              {
                field: {
                  id: 'dzFgQWimyVcl',
                  type: 'email',
                  ref: '20838a82-7f2e-46d1-b5a8-8873d91419fa',
                },
                type: 'email',
                email: email,
              },
            ],
          }),
        }
      );

      console.log('[Typeform] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.text();
        console.error('[Typeform] API error response:', error);
        return false;
      }

      const result = await response.json();
      console.log('[Typeform] Success! Response:', result);
      return true;
    } catch (error) {
      console.error('[Typeform] Error submitting:', error);
      return false;
    }
  }
}

export const typeformService = new TypeformService();
