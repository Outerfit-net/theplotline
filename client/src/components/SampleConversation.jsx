function SampleConversation() {
  return (
    <div className="bg-white p-8 rounded-lg border border-[var(--color-cream-dark)] prose-sample">
      <div className="mb-4 text-sm text-[var(--color-text-muted)]">
        <span className="italic">February 27, 2026</span>
        <span className="mx-2">&middot;</span>
        <span>Hemingway style</span>
        <span className="mx-2">&middot;</span>
        <span>Partly cloudy, 42&deg;F</span>
      </div>

      <div className="mb-4 text-[var(--color-green)] italic">
        Today: Late winter pruning before the sap rises
      </div>

      <div className="space-y-4 text-[var(--color-text)]">
        <p>
          "The sap will run soon," Buck said. He held the loppers loose in his hands.
          The apple tree was old. Twenty years at least.
        </p>

        <p>
          Harry looked at the branches. "You sure about this? What if we cut too much?"
        </p>

        <p>
          "You cut what's dead. What's crossed. What's growing in." Buck made the first cut clean.
          The branch fell without sound.
        </p>

        <p>
          Edie watched from the bench, her coffee steaming in the cold air.
          "My father used to say a pruned tree knows it's loved."
        </p>

        <p>
          "That's the thing," Buck said. "You're not taking away. You're making room."
        </p>

        <p>
          Harry nodded slow. He didn't quite believe it. But he took up his saw anyway.
        </p>
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--color-cream-dark)] text-[var(--color-text-muted)] italic">
        "To plant a garden is to believe in tomorrow." &mdash; Audrey Hepburn
      </div>

      <div className="mt-4 text-sm text-[var(--color-text-muted)]">
        Characters: Buck Thorn, Harry Kvetch, Edie Bell
      </div>
    </div>
  );
}

export default SampleConversation;
