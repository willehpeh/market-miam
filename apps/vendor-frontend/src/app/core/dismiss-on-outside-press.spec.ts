import { render, screen, fireEvent } from '@testing-library/angular';
import { DismissOnOutsidePress } from './dismiss-on-outside-press';

async function renderHost() {
  const dismissed = vi.fn();
  await render(
    `<button mmDismissOnOutsidePress (dismissed)="onDismiss()">
       <i data-testid="icon"></i>Confirmer
     </button>
     <p data-testid="elsewhere">ailleurs</p>`,
    { imports: [DismissOnOutsidePress], componentProperties: { onDismiss: dismissed } },
  );
  return { dismissed };
}

describe('DismissOnOutsidePress', () => {
  it('dismisses when the press lands outside the host', async () => {
    const { dismissed } = await renderHost();

    fireEvent.pointerDown(screen.getByTestId('elsewhere'));

    expect(dismissed).toHaveBeenCalledOnce();
  });

  it('holds when the press lands on the host', async () => {
    const { dismissed } = await renderHost();

    fireEvent.pointerDown(screen.getByRole('button', { name: /confirmer/i }));

    expect(dismissed).not.toHaveBeenCalled();
  });

  it('holds when the press lands on an icon inside the host', async () => {
    const { dismissed } = await renderHost();

    fireEvent.pointerDown(screen.getByTestId('icon'));

    expect(dismissed).not.toHaveBeenCalled();
  });

  it('dismisses on Escape', async () => {
    const { dismissed } = await renderHost();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(dismissed).toHaveBeenCalledOnce();
  });
});
